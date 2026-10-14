import { prisma } from "@/lib/db/prisma";
import type { BookingMaintenanceRepository } from "@/modules/booking/application/booking-maintenance.ports";
import { enqueueForUser, offerWaitlist, releaseCapacity } from "@/modules/booking/infrastructure/prisma-booking.repository";

export class PrismaBookingMaintenanceRepository implements BookingMaintenanceRepository {
  async expirePendingApprovals(now: Date, limit: number): Promise<number> {
    const due = await prisma.appointment.findMany({ where: { status: "PENDING", holdExpiresAt: { lte: now }, deletedAt: null }, orderBy: { holdExpiresAt: "asc" }, take: limit, select: {
      id: true, patientId: true, holdExpiresAt: true,
      slot: { select: { id: true, serviceId: true, doctorId: true, locationId: true, version: true, bookedCount: true, capacity: true, startsAt: true } },
      patient: { select: { userId: true } },
    } });
    let expired = 0;
    for (const appointment of due) {
      const didExpire = await prisma.$transaction(async (tx) => {
        const changed = await tx.appointment.updateMany({ where: { id: appointment.id, status: "PENDING", holdExpiresAt: { lte: now }, deletedAt: null }, data: { status: "EXPIRED", holdExpiresAt: null, cancelledAt: now } });
        if (changed.count !== 1) return false;
        await releaseCapacity(tx, appointment.slot);
        await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: "PENDING", toStatus: "EXPIRED", reason: "HOLD_EXPIRED" } });
        await tx.notification.updateMany({ where: { appointmentId: appointment.id, templateKey: { in: ["appointment.reminder.24h", "appointment.reminder.1h"] }, status: "QUEUED", deletedAt: null }, data: { status: "CANCELLED" } });
        await enqueueForUser(tx, appointment.patient.userId, appointment.id, "appointment.expired", now, null);
        await offerWaitlist(tx, appointment.slot, now);
        return true;
      }, { isolationLevel: "Serializable" });
      if (didExpire) expired += 1;
    }
    return expired;
  }

  async expireWaitlistOffers(now: Date, limit: number): Promise<number> {
    const due = await prisma.waitlistEntry.findMany({ where: { status: "OFFERED", offeredUntil: { lte: now }, deletedAt: null }, orderBy: { offeredUntil: "asc" }, take: limit, select: {
      id: true, offeredUntil: true,
      offeredSlot: { select: { id: true, serviceId: true, doctorId: true, locationId: true, version: true, bookedCount: true, capacity: true, startsAt: true } },
    } });
    let expired = 0;
    for (const entry of due) {
      const didExpire = await prisma.$transaction(async (tx) => {
        const changed = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "OFFERED", offeredUntil: { lte: now }, deletedAt: null }, data: { status: "EXPIRED", offeredSlotId: null, offeredUntil: null } });
        if (changed.count !== 1) return false;
        if (entry.offeredSlot && entry.offeredSlot.bookedCount > 0) {
          await releaseCapacity(tx, entry.offeredSlot);
          await offerWaitlist(tx, entry.offeredSlot, now);
        }
        return true;
      }, { isolationLevel: "Serializable" });
      if (didExpire) expired += 1;
    }
    return expired;
  }
}
