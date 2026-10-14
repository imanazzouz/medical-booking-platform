import { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import type { AvailabilityManagementRepository } from "@/modules/scheduling/application/availability-management.ports";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "استخدم صيغة HH:mm");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, "تاريخ غير صالح");
const uuid = z.string().uuid();
const ruleSchema = z.object({
  serviceId: uuid,
  doctorId: uuid.nullable().optional(),
  locationId: uuid.nullable().optional(),
  weekday: z.number().int().min(1).max(7),
  startTime: timeSchema,
  endTime: timeSchema,
  timezone: z.string().min(1).max(64).default("Africa/Algiers"),
  validFrom: dateSchema.nullable().optional(),
  validUntil: dateSchema.nullable().optional(),
}).strict();
const exceptionSchema = z.object({
  ruleId: uuid,
  date: dateSchema,
  type: z.enum(["CLOSED", "OPEN_EXTRA"]),
  startTime: timeSchema.nullable().optional(),
  endTime: timeSchema.nullable().optional(),
  internalReason: z.string().trim().max(300).nullable().optional(),
}).strict();
const generationSchema = z.object({
  serviceId: uuid,
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
}).strict();

function parseTime(value: string): Date {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hour, minute));
}
function parseDay(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
function validateTimezone(value: string): void {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); }
  catch { throw new ValidationError({ timezone: ["منطقة زمنية غير صالحة"] }); }
}
function validateRange(start: string, end: string): void {
  if (start >= end) throw new ValidationError({ endTime: ["يجب أن يكون وقت النهاية بعد وقت البداية؛ قسّم الدوام الليلي إلى قاعدتين"] });
}

export class AvailabilityManagementService {
  constructor(private readonly repository: AvailabilityManagementRepository, private readonly now: () => Date = () => new Date()) {}

  async listRules(userId: string, serviceId: string) {
    if (!await this.repository.canManageService(userId, serviceId)) throw new ForbiddenError();
    return this.repository.listRules(serviceId);
  }

  async createRule(userId: string, raw: unknown) {
    const parsed = ruleSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const input = parsed.data;
    validateTimezone(input.timezone);
    validateRange(input.startTime, input.endTime);
    if (input.doctorId == null && input.locationId == null) throw new ValidationError({ resource: ["حدد الطبيب أو الموقع على الأقل"] });
    if (input.validFrom && input.validUntil && input.validFrom > input.validUntil) throw new ValidationError({ validUntil: ["يجب أن يكون تاريخ النهاية بعد البداية"] });
    const created = await translateRepositoryError(this.repository.createRule(userId, {
      ...input, doctorId: input.doctorId ?? null, locationId: input.locationId ?? null,
      startTime: parseTime(input.startTime), endTime: parseTime(input.endTime),
      validFrom: parseDay(input.validFrom), validUntil: parseDay(input.validUntil),
    }));
    if (!created) throw new NotFoundError("الخدمة أو المورد غير متاح");
    return created;
  }

  async replaceRule(userId: string, ruleId: string, raw: unknown) {
    const parsed = ruleSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const input = parsed.data;
    validateTimezone(input.timezone);
    validateRange(input.startTime, input.endTime);
    if (input.doctorId == null && input.locationId == null) throw new ValidationError({ resource: ["حدد الطبيب أو الموقع على الأقل"] });
    if (input.validFrom && input.validUntil && input.validFrom > input.validUntil) throw new ValidationError({ validUntil: ["يجب أن يكون تاريخ النهاية بعد البداية"] });
    const updated = await translateRepositoryError(this.repository.replaceRule(userId, ruleId, {
      ...input, doctorId: input.doctorId ?? null, locationId: input.locationId ?? null,
      startTime: parseTime(input.startTime), endTime: parseTime(input.endTime),
      validFrom: parseDay(input.validFrom), validUntil: parseDay(input.validUntil),
    }));
    if (!updated) throw new NotFoundError("قاعدة الدوام غير موجودة");
    return updated;
  }

  async deleteRule(userId: string, ruleId: string) {
    const deleted = await translateRepositoryError(this.repository.deleteRule(userId, ruleId, this.now()));
    if (!deleted) throw new NotFoundError("قاعدة الدوام غير موجودة");
    return { deleted: true };
  }

  async createException(userId: string, raw: unknown) {
    const parsed = exceptionSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const input = parsed.data;
    const startTime = input.startTime ?? null;
    const endTime = input.endTime ?? null;
    if ((startTime === null) !== (endTime === null)) throw new ValidationError({ time: ["يجب تحديد وقت البداية والنهاية معاً"] });
    if (input.type === "OPEN_EXTRA" && (!startTime || !endTime)) throw new ValidationError({ time: ["استثناء فتح وقت إضافي يحتاج إلى وقت بداية ونهاية"] });
    if (startTime && endTime) validateRange(startTime, endTime);
    const created = await translateRepositoryError(this.repository.createException(userId, {
      ruleId: input.ruleId, date: parseDay(input.date)!, type: input.type,
      startTime: startTime ? parseTime(startTime) : null,
      endTime: endTime ? parseTime(endTime) : null,
      internalReason: input.internalReason ?? null,
    }));
    if (!created) throw new NotFoundError("قاعدة الدوام غير موجودة أو لا تملك صلاحية إدارتها");
    return created;
  }

  async deleteException(userId: string, exceptionId: string) {
    const deleted = await translateRepositoryError(this.repository.deleteException(userId, exceptionId, this.now()));
    if (!deleted) throw new NotFoundError("الاستثناء غير موجود");
    return { deleted: true };
  }

  async generate(userId: string, raw: unknown) {
    const parsed = generationSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const from = new Date(parsed.data.from);
    const to = new Date(parsed.data.to);
    const now = this.now();
    if (to <= from || to.getTime() - from.getTime() > 90 * 86_400_000) throw new ValidationError({ dateRange: ["يجب أن تكون نافذة التوليد حتى 90 يوماً"] });
    if (from < now) throw new ValidationError({ from: ["لا يمكن توليد فترات ماضية"] });
    try { return await this.repository.generateForService(userId, parsed.data.serviceId, from, to, now); }
    catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "NOT_AUTHORIZED") throw new ForbiddenError();
      if (code === "SERVICE_NOT_FOUND") throw new NotFoundError("الخدمة غير موجودة");
      if (code === "INVALID_TIMEZONE") throw new ValidationError({ timezone: ["تحتوي قاعدة على منطقة زمنية غير صالحة"] });
      if (code === "INVALID_SERVICE_DURATION") throw new ValidationError({ durationMinutes: ["مدة الخدمة غير صالحة"] });
      if (code === "SLOT_OVERLAP") throw new ConflictError("توجد فترات متعارضة لمورد واحد؛ راجع قواعد الدوام");
      throw error;
    }
  }
}


async function translateRepositoryError<T>(operation: Promise<T>): Promise<T> {
  try { return await operation; } catch (error) {
    const marker = error instanceof Error ? error.message : "";
    if (marker === "NOT_AUTHORIZED") throw new ForbiddenError();
    if (marker === "RULE_OVERLAP") throw new ConflictError("قاعدة الدوام تتعارض مع قاعدة أخرى للمورد نفسه");
    if (hasPrismaCode(error, "P2002") || hasPrismaCode(error, "P2034") || hasPrismaCode(error, "P2004")) throw new ConflictError("تعارضت العملية مع تحديث متزامن؛ أعد المحاولة");
    throw error;
  }
}
function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}
