import { prisma } from "@/lib/db/prisma";
import type { AvailabilityManagementRepository, ExceptionInput, RuleInput } from "@/modules/scheduling/application/availability-management.ports";
import { generateSlots, type GenerationRule } from "@/modules/scheduling/application/slot-generator";

function minuteOfDay(time: Date): number { return time.getUTCHours() * 60 + time.getUTCMinutes(); }
function dateNumber(date: Date | null, fallback: number): number { return date ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : fallback; }
function overlapsRule(a: RuleInput, b: { startTime: Date; endTime: Date; validFrom: Date | null; validUntil: Date | null }): boolean {
  const timeOverlap = minuteOfDay(a.startTime) < minuteOfDay(b.endTime) && minuteOfDay(a.endTime) > minuteOfDay(b.startTime);
  const dateOverlap = dateNumber(a.validFrom, -Infinity) <= dateNumber(b.validUntil, Infinity) && dateNumber(a.validUntil, Infinity) >= dateNumber(b.validFrom, -Infinity);
  return timeOverlap && dateOverlap;
}
function resourceKey(input: Pick<RuleInput, "doctorId" | "locationId" | "serviceId">): string {
  return input.doctorId ? `doctor:${input.doctorId}` : `service:${input.serviceId}:location:${input.locationId ?? "remote"}`;
}

export class PrismaAvailabilityManagementRepository implements AvailabilityManagementRepository {
  async canManageService(userId: string, serviceId: string): Promise<boolean> {
    const service = await prisma.service.findFirst({ where: { id: serviceId, deletedAt: null }, select: { organizationId: true } });
    if (!service) return false;
    const admin = await prisma.user.findFirst({ where: { id: userId, role: "ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (admin) return true;
    return Boolean(await prisma.organizationMember.findFirst({ where: {
      userId, organizationId: service.organizationId, status: "ACTIVE", deletedAt: null,
      role: { in: ["OWNER", "ADMIN", "DOCTOR"] }, organization: { status: { in: ["ACTIVE", "PENDING_REVIEW"] }, deletedAt: null },
    }, select: { id: true } }));
  }

  listRules(serviceId: string): Promise<unknown[]> {
    return prisma.availabilityRule.findMany({
      where: { serviceId, deletedAt: null }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      select: { id: true, serviceId: true, doctorId: true, locationId: true, weekday: true, startTime: true, endTime: true, timezone: true, validFrom: true, validUntil: true, isActive: true,
        exceptions: { where: { deletedAt: null }, orderBy: { date: "asc" }, select: { id: true, date: true, type: true, startTime: true, endTime: true, internalReason: true } } },
    });
  }

  async createRule(userId: string, input: RuleInput): Promise<unknown | null> {
    return prisma.$transaction(async (tx) => {
      const service = await this.authorizeService(tx, userId, input.serviceId, input.doctorId, input.locationId);
      if (!service) return null;
      const key = resourceKey(input);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      await this.ensureNoRuleOverlap(tx, input);
      return tx.availabilityRule.create({ data: input, select: ruleView });
    }, { isolationLevel: "Serializable" });
  }

  async replaceRule(userId: string, ruleId: string, input: RuleInput): Promise<unknown | null> {
    return prisma.$transaction(async (tx) => {
      const previous = await tx.availabilityRule.findFirst({ where: { id: ruleId, deletedAt: null }, select: { id: true, serviceId: true, doctorId: true, locationId: true } });
      if (!previous || previous.serviceId !== input.serviceId) return null;
      const service = await this.authorizeService(tx, userId, input.serviceId, input.doctorId, input.locationId);
      if (!service) return null;
      const keys = [...new Set([resourceKey(previous), resourceKey(input)])].sort();
      for (const key of keys) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      await this.ensureNoRuleOverlap(tx, input, ruleId);
      await tx.appointmentSlot.updateMany({
        where: { availabilityRuleId: ruleId, deletedAt: null, status: { in: ["AVAILABLE", "FULL"] }, bookedCount: 0, startsAt: { gt: new Date() } },
        data: { status: "BLOCKED", version: { increment: 1 } },
      });
      return tx.availabilityRule.update({ where: { id: ruleId }, data: input, select: ruleView });
    }, { isolationLevel: "Serializable" });
  }

  async deleteRule(userId: string, ruleId: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const rule = await tx.availabilityRule.findFirst({ where: { id: ruleId, deletedAt: null }, select: { id: true, serviceId: true, doctorId: true, locationId: true } });
      if (!rule) return false;
      if (!await this.authorizeService(tx, userId, rule.serviceId, rule.doctorId, rule.locationId)) return false;
      const key = resourceKey({ ...rule, serviceId: rule.serviceId });
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      await tx.availabilityRule.update({ where: { id: ruleId }, data: { isActive: false, deletedAt: now } });
      await tx.appointmentSlot.updateMany({ where: { availabilityRuleId: ruleId, startsAt: { gt: now }, bookedCount: 0, deletedAt: null }, data: { status: "BLOCKED", version: { increment: 1 } } });
      return true;
    }, { isolationLevel: "Serializable" });
  }

  async createException(userId: string, input: ExceptionInput): Promise<unknown | null> {
    return prisma.$transaction(async (tx) => {
      const rule = await tx.availabilityRule.findFirst({ where: { id: input.ruleId, deletedAt: null }, select: { id: true, serviceId: true, doctorId: true, locationId: true } });
      if (!rule || !await this.authorizeService(tx, userId, rule.serviceId, rule.doctorId, rule.locationId)) return null;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${resourceKey({ ...rule, serviceId: rule.serviceId })}, 0))`;
      const exception = await tx.availabilityException.create({ data: input, select: { id: true, ruleId: true, date: true, type: true, startTime: true, endTime: true } });
      await tx.appointmentSlot.updateMany({
        where: { availabilityRuleId: rule.id, startsAt: { gte: startOfUtcDay(input.date), lt: nextUtcDay(input.date) }, bookedCount: 0, deletedAt: null, status: { in: ["AVAILABLE", "FULL"] } },
        data: { status: "BLOCKED", version: { increment: 1 } },
      });
      return exception;
    }, { isolationLevel: "Serializable" });
  }

  async deleteException(userId: string, exceptionId: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const exception = await tx.availabilityException.findFirst({ where: { id: exceptionId, deletedAt: null }, select: { id: true, ruleId: true, rule: { select: { serviceId: true, doctorId: true, locationId: true } } } });
      if (!exception || !await this.authorizeService(tx, userId, exception.rule.serviceId, exception.rule.doctorId, exception.rule.locationId)) return false;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${resourceKey({ ...exception.rule, serviceId: exception.rule.serviceId })}, 0))`;
      await tx.availabilityException.update({ where: { id: exception.id }, data: { deletedAt: now } });
      await tx.appointmentSlot.updateMany({ where: { availabilityRuleId: exception.ruleId, startsAt: { gt: now }, bookedCount: 0, deletedAt: null, status: { in: ["AVAILABLE", "FULL"] } }, data: { status: "BLOCKED", version: { increment: 1 } } });
      return true;
    }, { isolationLevel: "Serializable" });
  }

  async generateForService(userId: string, serviceId: string, from: Date, to: Date, now: Date) {
    const rulesData = await prisma.$transaction(async (tx) => {
      const service = await this.authorizeService(tx, userId, serviceId, null, null);
      if (!service) {
        const exists = await tx.service.findFirst({ where: { id: serviceId, deletedAt: null }, select: { id: true } });
        throw new Error(exists ? "NOT_AUTHORIZED" : "SERVICE_NOT_FOUND");
      }
      const rules = await tx.availabilityRule.findMany({ where: { serviceId, isActive: true, deletedAt: null, OR: [{ validFrom: null }, { validFrom: { lte: to } }], AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: from } }] }] }, include: { exceptions: { where: { deletedAt: null } } } });
      return { serviceDuration: service.durationMinutes, rules };
    });
    const generationRules: GenerationRule[] = rulesData.rules.map((rule) => ({
      id: rule.id, weekday: rule.weekday, startTime: rule.startTime, endTime: rule.endTime, timezone: rule.timezone,
      validFrom: rule.validFrom, validUntil: rule.validUntil, doctorId: rule.doctorId, locationId: rule.locationId,
      exceptions: rule.exceptions.map((exception) => ({ date: exception.date, type: exception.type, startTime: exception.startTime, endTime: exception.endTime })),
    }));
    const candidates = generateSlots({ serviceId, durationMinutes: rulesData.serviceDuration, from, to, now, rules: generationRules });
    if (!candidates.length) return { created: 0, reactivated: 0, skippedConflicts: 0, slots: [] };

    return prisma.$transaction(async (tx) => {
      const resourceKeys = [...new Set(candidates.map((slot) => slot.resourceKey))].sort();
      for (const key of resourceKeys) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      // Reconcile unbooked materialized slots against the current schedule, preserving booked rows.
      await tx.appointmentSlot.updateMany({
        where: { serviceId, availabilityRuleId: { in: generationRules.map((rule) => rule.id) }, startsAt: { gte: from, lt: to }, bookedCount: 0, deletedAt: null, status: { in: ["AVAILABLE", "FULL"] } },
        data: { status: "BLOCKED", version: { increment: 1 } },
      });
      const activeSlots = await tx.appointmentSlot.findMany({ where: { resourceKey: { in: resourceKeys }, startsAt: { lt: to }, endsAt: { gt: from }, deletedAt: null, status: { not: "BLOCKED" } }, select: { id: true, serviceId: true, availabilityRuleId: true, resourceKey: true, startsAt: true, endsAt: true, bookedCount: true } });
      let created = 0;
      let reactivated = 0;
      let skippedConflicts = 0;
      for (const candidate of candidates) {
        const collision = activeSlots.some((slot) => slot.resourceKey === candidate.resourceKey && slot.startsAt < candidate.endsAt && slot.endsAt > candidate.startsAt);
        if (collision) { skippedConflicts += 1; continue; }
        const blocked = await tx.appointmentSlot.findFirst({ where: { availabilityRuleId: candidate.availabilityRuleId, resourceKey: candidate.resourceKey, startsAt: candidate.startsAt, status: "BLOCKED", bookedCount: 0, deletedAt: null }, select: { id: true } });
        if (blocked) {
          const result = await tx.appointmentSlot.updateMany({ where: { id: blocked.id, status: "BLOCKED", version: { gte: 0 } }, data: { status: "AVAILABLE", endsAt: candidate.endsAt, version: { increment: 1 } } });
          if (result.count === 1) {
            reactivated += 1;
            activeSlots.push({ id: blocked.id, serviceId, availabilityRuleId: candidate.availabilityRuleId, resourceKey: candidate.resourceKey, startsAt: candidate.startsAt, endsAt: candidate.endsAt, bookedCount: 0 });
            continue;
          }
        }
        const inserted = await tx.appointmentSlot.create({ data: { ...candidate }, select: { id: true, serviceId: true, availabilityRuleId: true, resourceKey: true, startsAt: true, endsAt: true, bookedCount: true } });
        activeSlots.push(inserted);
        created += 1;
      }
      return { created, reactivated, skippedConflicts, slots: candidates };
    }, { isolationLevel: "Serializable" });
  }

  async generateHorizon(from: Date, to: Date, now: Date) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!admin) throw new Error("ACTIVE_ADMIN_REQUIRED");
    let cursor: string | undefined;
    let services = 0;
    let created = 0;
    let reactivated = 0;
    let skippedConflicts = 0;
    const failures: Array<{ serviceId: string; code: string }> = [];
    const batchSize = 50;
    while (true) {
      const batch = await prisma.service.findMany({
        where: {
          isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null },
          availabilityRules: { some: { isActive: true, deletedAt: null } },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" }, take: batchSize, select: { id: true },
      });
      if (!batch.length) break;
      for (const service of batch) {
        try {
          const result = await this.generateForService(admin.id, service.id, from, to, now);
          services += 1;
          created += result.created;
          reactivated += "reactivated" in result ? result.reactivated : 0;
          skippedConflicts += "skippedConflicts" in result ? result.skippedConflicts : 0;
        } catch (error) {
          failures.push({ serviceId: service.id, code: safeFailureCode(error) });
        }
      }
      cursor = batch[batch.length - 1].id;
      if (batch.length < batchSize) break;
    }
    return { services, created, reactivated, skippedConflicts, failures };
  }

  private async authorizeService(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], userId: string, serviceId: string, doctorId: string | null, locationId: string | null) {
    const service = await tx.service.findFirst({ where: { id: serviceId, isActive: true, deletedAt: null, organization: { deletedAt: null, status: { in: ["ACTIVE", "PENDING_REVIEW"] } } }, select: { id: true, organizationId: true, durationMinutes: true } });
    if (!service) return null;
    const admin = await tx.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null, role: "ADMIN" }, select: { id: true } });
    if (!admin) {
      const membership = await tx.organizationMember.findFirst({ where: { organizationId: service.organizationId, userId, status: "ACTIVE", deletedAt: null, role: { in: ["OWNER", "ADMIN", "DOCTOR"] } }, select: { id: true } });
      if (!membership) throw new Error("NOT_AUTHORIZED");
    }
    if (doctorId) {
      const assigned = await tx.serviceDoctor.findFirst({ where: { serviceId, doctorId, deletedAt: null }, select: { doctorId: true } });
      if (!assigned) throw new Error("NOT_AUTHORIZED");
    }
    if (locationId) {
      const location = await tx.serviceLocation.findFirst({ where: { serviceId, locationId, deletedAt: null, location: { deletedAt: null } }, select: { locationId: true } });
      if (!location) throw new Error("NOT_AUTHORIZED");
    }
    return service;
  }

  private async ensureNoRuleOverlap(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], input: RuleInput, exceptId?: string): Promise<void> {
    const existing = await tx.availabilityRule.findMany({ where: {
      id: exceptId ? { not: exceptId } : undefined,
      weekday: input.weekday, isActive: true, deletedAt: null,
      ...(input.doctorId ? { doctorId: input.doctorId } : { doctorId: null, locationId: input.locationId }),
    }, select: { startTime: true, endTime: true, validFrom: true, validUntil: true } });
    if (existing.some((row) => overlapsRule(input, row))) throw new Error("RULE_OVERLAP");
  }
}

const ruleView = {
  id: true, serviceId: true, doctorId: true, locationId: true, weekday: true,
  startTime: true, endTime: true, timezone: true, validFrom: true, validUntil: true, isActive: true,
} as const;
function startOfUtcDay(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function nextUtcDay(date: Date): Date { const next = startOfUtcDay(date); next.setUTCDate(next.getUTCDate() + 1); return next; }
function safeFailureCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string") {
    const prismaCode = (error as { code: string }).code;
    if (/^P\d{4}$/.test(prismaCode)) return prismaCode;
  }
  const marker = error instanceof Error ? error.message : "";
  const known = new Set(["NOT_AUTHORIZED", "SERVICE_NOT_FOUND", "INVALID_TIMEZONE", "INVALID_SERVICE_DURATION", "SLOT_OVERLAP", "RULE_OVERLAP"]);
  return known.has(marker) ? marker : "GENERATION_FAILED";
}
