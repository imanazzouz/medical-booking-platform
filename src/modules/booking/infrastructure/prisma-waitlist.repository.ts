import { prisma } from "@/lib/db/prisma";
import type { WaitlistInput, WaitlistRepository } from "@/modules/booking/application/waitlist.ports";
import { appointmentView, enqueueForUser, offerWaitlist, releaseCapacity } from "@/modules/booking/infrastructure/prisma-booking.repository";

const waitlistView = {
  id: true, serviceId: true, doctorId: true, locationId: true, earliestAt: true, latestAt: true,
  status: true, offeredUntil: true, createdAt: true,
  offeredSlot: { select: { id: true, startsAt: true, endsAt: true } },
} as const;

export class PrismaWaitlistRepository implements WaitlistRepository {
  async patientIdForUser(userId: string): Promise<string | null> {
    const profile = await prisma.patientProfile.findFirst({ where: { userId, deletedAt: null, user: { status: "ACTIVE", deletedAt: null } }, select: { id: true } });
    return profile?.id ?? null;
  }

  async create(userId: string, patientId: string, input: WaitlistInput, now: Date) {
    return prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirst({ where: { id: input.serviceId, isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } }, select: { id: true } });
      if (!service) throw new Error("SERVICE_NOT_FOUND");
      if (input.doctorId && !await tx.serviceDoctor.findFirst({ where: { serviceId: input.serviceId, doctorId: input.doctorId, deletedAt: null, doctor: { verificationStatus: "VERIFIED", deletedAt: null } }, select: { doctorId: true } })) throw new Error("INVALID_RESOURCE");
      if (input.locationId && !await tx.serviceLocation.findFirst({ where: { serviceId: input.serviceId, locationId: input.locationId, deletedAt: null, location: { deletedAt: null } }, select: { locationId: true } })) throw new Error("INVALID_RESOURCE");
      const duplicate = await tx.waitlistEntry.findFirst({ where: { patientId, serviceId: input.serviceId, status: { in: ["WAITING", "OFFERED"] }, deletedAt: null }, select: { id: true } });
      if (duplicate) throw new Error("WAITLIST_EXISTS");
      const entry = await tx.waitlistEntry.create({ data: { patientId, serviceId: input.serviceId, doctorId: input.doctorId, locationId: input.locationId, earliestAt: input.earliestAt, latestAt: input.latestAt }, select: waitlistView });
      await enqueueForUser(tx, userId, null, "waitlist.joined", now, null, `waitlist:${entry.id}`);
      return entry;
    }, { isolationLevel: "Serializable" });
  }

  list(patientId: string): Promise<unknown[]> {
    return prisma.waitlistEntry.findMany({ where: { patientId, deletedAt: null, status: { in: ["WAITING", "OFFERED", "BOOKED"] } }, orderBy: [{ createdAt: "desc" }], select: waitlistView });
  }

  async cancel(patientId: string, entryId: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findFirst({ where: { id: entryId, patientId, deletedAt: null, status: { in: ["WAITING", "OFFERED"] } }, select: {
        id: true, status: true, offeredSlotId: true,
        offeredSlot: { select: { id: true, serviceId: true, doctorId: true, locationId: true, startsAt: true, version: true, bookedCount: true, capacity: true } },
      } });
      if (!entry) return false;
      const changed = await tx.waitlistEntry.updateMany({ where: { id: entry.id, patientId, status: entry.status, deletedAt: null }, data: { status: "CANCELLED", offeredSlotId: null, offeredUntil: null } });
      if (changed.count !== 1) return false;
      if (entry.status === "OFFERED" && entry.offeredSlot && entry.offeredSlot.bookedCount > 0) {
        await releaseCapacity(tx, entry.offeredSlot);
        await offerWaitlist(tx, entry.offeredSlot, now);
      }
      return true;
    }, { isolationLevel: "Serializable" });
  }

  async accept(patientId: string, entryId: string, bookingReference: string, now: Date) {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findFirst({ where: { id: entryId, patientId, deletedAt: null }, select: {
        id: true, status: true, appointmentId: true, offeredUntil: true, offeredSlotId: true,
        patient: { select: { userId: true } },
        offeredSlot: {
          select: {
            id: true, serviceId: true, doctorId: true, locationId: true, version: true, bookedCount: true, capacity: true, status: true, startsAt: true,
            service: { select: { bookingMode: true, approvalHoldMinutes: true, isActive: true, deletedAt: true, organization: { select: { status: true, deletedAt: true } } } },
          },
        },
      } });
      if (!entry) return { kind: "not-found" as const };
      if (entry.status === "BOOKED" && entry.appointmentId) {
        const replay = await tx.appointment.findFirst({ where: { id: entry.appointmentId, patientId, deletedAt: null }, select: appointmentView });
        return replay ? { kind: "booked" as const, appointment: replay } : { kind: "not-found" as const };
      }
      if (entry.status !== "OFFERED" || !entry.offeredUntil || !entry.offeredSlotId || !entry.offeredSlot) return { kind: "unavailable" as const };
      if (entry.offeredUntil <= now || entry.offeredSlot.startsAt <= now) {
        const expired = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "OFFERED", offeredUntil: entry.offeredUntil }, data: { status: "EXPIRED", offeredSlotId: null, offeredUntil: null } });
        if (expired.count === 1 && entry.offeredSlot.bookedCount > 0) {
          await releaseCapacity(tx, entry.offeredSlot);
          await offerWaitlist(tx, entry.offeredSlot, now);
        }
        return { kind: "expired" as const };
      }
      if (entry.offeredSlot.bookedCount < 1 || entry.offeredSlot.status === "BLOCKED" || !entry.offeredSlot.service.isActive || entry.offeredSlot.service.deletedAt || entry.offeredSlot.service.organization.status !== "ACTIVE" || entry.offeredSlot.service.organization.deletedAt) return { kind: "unavailable" as const };
      const requiresApproval = entry.offeredSlot.service.bookingMode === "APPROVAL_REQUIRED";
      const status = requiresApproval ? "PENDING" : "CONFIRMED";
      const holdExpiresAt = requiresApproval ? new Date(now.getTime() + Math.max(1, Math.min(entry.offeredSlot.service.approvalHoldMinutes, 1440)) * 60_000) : null;
      const appointment = await tx.appointment.create({
        data: { patientId, slotId: entry.offeredSlot.id, bookingReference, status, confirmedAt: status === "CONFIRMED" ? now : null, holdExpiresAt,
          statusHistory: { create: { fromStatus: null, toStatus: status, reason: "BOOKED" } } }, select: appointmentView,
      });
      const updated = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "OFFERED", offeredUntil: { gt: now } }, data: { status: "BOOKED", appointmentId: appointment.id, offeredSlotId: null, offeredUntil: null } });
      if (updated.count !== 1) throw new Error("WAITLIST_RACE");
      await enqueueForUser(tx, entry.patient.userId, appointment.id, status === "CONFIRMED" ? "appointment.confirmed" : "appointment.requested", now, status === "CONFIRMED" ? entry.offeredSlot.startsAt : null);
      return { kind: "booked" as const, appointment };
    }, { isolationLevel: "Serializable" });
    if (result.kind === "not-found") throw new Error("WAITLIST_NOT_FOUND");
    if (result.kind === "expired") throw new Error("OFFER_EXPIRED");
    if (result.kind === "unavailable") throw new Error("OFFER_NOT_AVAILABLE");
    return result.appointment;
  }
}
