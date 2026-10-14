import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { BookingRepository } from "@/modules/booking/application/booking.ports";
import type { AppointmentResponseDto } from "@/modules/booking/application/booking.dto";

export const appointmentView = {
  id: true, bookingReference: true, status: true, createdAt: true, holdExpiresAt: true,
  slot: { select: {
    startsAt: true, endsAt: true,
    location: { select: { id: true, name: true, addressLine: true, city: true, timezone: true } },
    doctor: { select: { id: true, publicSlug: true, user: { select: { name: true } } } },
    service: { select: {
      id: true, type: true, price: true, currency: true, durationMinutes: true,
      translations: { where: { deletedAt: null }, select: { locale: true, name: true }, take: 2 },
      organization: { select: { id: true, slug: true, type: true, translations: { where: { deletedAt: null }, select: { locale: true, name: true }, take: 2 } } },
    } },
  } },
} as const;

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_1H_MS = 60 * 60 * 1000;

export class PrismaBookingRepository implements BookingRepository {
  async patientIdForUser(userId: string): Promise<string | null> {
    const profile = await prisma.patientProfile.findFirst({ where: { userId, deletedAt: null, user: { status: "ACTIVE", deletedAt: null } }, select: { id: true } });
    return profile?.id ?? null;
  }
  getByIdempotencyHash(hash: string) {
    return prisma.appointment.findFirst({ where: { idempotencyKeyHash: hash, deletedAt: null }, select: { id: true, requestHash: true, patientId: true } });
  }
  getMutationIdempotency(userId: string, keyHash: string, now: Date) {
    return prisma.idempotencyRecord.findFirst({ where: { userId, operation: "RESCHEDULE", keyHash, expiresAt: { gt: now } }, select: { requestHash: true, appointmentId: true } });
  }

  async createBooking(input: { patientId: string; slotId: string; bookingReference: string; idempotencyKeyHash: string; requestHash: string; now: Date }): Promise<AppointmentResponseDto> {
    return prisma.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.findFirst({
        where: { id: input.slotId, deletedAt: null, status: "AVAILABLE", startsAt: { gt: input.now },
          AND: [{ OR: [{ doctorId: null, service: { requiresDoctor: false } }, { doctor: { is: { deletedAt: null, verificationStatus: "VERIFIED" } } }] }],
          service: { isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } } },
        select: { id: true, version: true, startsAt: true, endsAt: true, capacity: true, bookedCount: true, doctorId: true,
          service: { select: { id: true, requiresDoctor: true, bookingMode: true, approvalHoldMinutes: true, doctorAssignments: { where: { deletedAt: null }, select: { doctorId: true } } } } },
      });
      if (!slot || (slot.service.requiresDoctor && !slot.doctorId) || (slot.doctorId && !slot.service.doctorAssignments.some((assignment) => assignment.doctorId === slot.doctorId))) throw new Error("SLOT_UNAVAILABLE");
      const bookingMode = slot.service.bookingMode;
      const status = bookingMode === "INSTANT" ? "CONFIRMED" : "PENDING";
      const holdExpiresAt = status === "PENDING" ? new Date(input.now.getTime() + Math.max(1, Math.min(slot.service.approvalHoldMinutes, 1440)) * 60_000) : null;
      const claimed = await tx.appointmentSlot.updateMany({
        where: { id: slot.id, deletedAt: null, status: "AVAILABLE", version: slot.version, startsAt: { gt: input.now }, bookedCount: { lt: slot.capacity } },
        data: { bookedCount: { increment: 1 }, version: { increment: 1 }, ...(slot.bookedCount + 1 >= slot.capacity ? { status: "FULL" } : {}) },
      });
      if (claimed.count !== 1) throw new Error("SLOT_UNAVAILABLE");
      const created = await tx.appointment.create({
        data: {
          patientId: input.patientId, slotId: slot.id, bookingReference: input.bookingReference,
          idempotencyKeyHash: input.idempotencyKeyHash, requestHash: input.requestHash, status,
          confirmedAt: status === "CONFIRMED" ? input.now : null, holdExpiresAt,
          statusHistory: { create: { fromStatus: null, toStatus: status, reason: "BOOKED" } },
        }, select: appointmentView,
      });
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: input.patientId }, select: { userId: true } });
      const template = status === "CONFIRMED" ? "appointment.confirmed" : "appointment.requested";
      await enqueueForUser(tx, patient.userId, created.id, template, input.now, status === "CONFIRMED" ? slot.startsAt : null);
      return created;
    }, { isolationLevel: "Serializable" });
  }

  async cancelBooking(input: { appointmentId: string; patientId: string; now: Date }): Promise<AppointmentResponseDto> {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({ where: { id: input.appointmentId, patientId: input.patientId, deletedAt: null }, select: {
        id: true, status: true, slotId: true,
        slot: { select: { id: true, serviceId: true, doctorId: true, locationId: true, version: true, bookedCount: true, capacity: true, startsAt: true,
          service: { select: { cancellationNoticeMinutes: true } } } },
      } });
      if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");
      if (appointment.status === "CANCELLED") return tx.appointment.findUniqueOrThrow({ where: { id: appointment.id }, select: appointmentView });
      if (!["PENDING", "CONFIRMED"].includes(appointment.status) || appointment.slot.startsAt <= input.now || appointment.slot.startsAt.getTime() - input.now.getTime() < appointment.slot.service.cancellationNoticeMinutes * 60_000) throw new Error("APPOINTMENT_NOT_CANCELLABLE");
      const updated = await tx.appointment.updateMany({ where: { id: appointment.id, status: { in: ["PENDING", "CONFIRMED"] }, slotId: appointment.slotId, deletedAt: null }, data: { status: "CANCELLED", cancelledAt: input.now, holdExpiresAt: null } });
      if (updated.count !== 1) throw new Error("APPOINTMENT_NOT_CANCELLABLE");
      await releaseCapacity(tx, appointment.slot);
      await cancelReminders(tx, appointment.id);
      await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, fromStatus: appointment.status, toStatus: "CANCELLED", reason: "PATIENT_CANCELLED" } });
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: input.patientId }, select: { userId: true } });
      await enqueueForUser(tx, patient.userId, appointment.id, "appointment.cancelled", input.now, null);
      await offerWaitlist(tx, appointment.slot, input.now);
      return tx.appointment.findUniqueOrThrow({ where: { id: appointment.id }, select: appointmentView });
    }, { isolationLevel: "Serializable" });
  }

  async rescheduleBooking(input: { userId: string; appointmentId: string; patientId: string; slotId: string; keyHash: string; requestHash: string; now: Date }): Promise<AppointmentResponseDto> {
    return prisma.$transaction(async (tx) => {
      await tx.idempotencyRecord.deleteMany({ where: { userId: input.userId, operation: "RESCHEDULE", expiresAt: { lte: input.now } } });
      const old = await tx.appointment.findFirst({ where: { id: input.appointmentId, patientId: input.patientId, deletedAt: null }, select: {
        id: true, status: true, slotId: true,
        slot: { select: { id: true, serviceId: true, doctorId: true, locationId: true, version: true, bookedCount: true, capacity: true, startsAt: true, service: { select: { cancellationNoticeMinutes: true, bookingMode: true, approvalHoldMinutes: true } } } },
      } });
      if (!old) throw new Error("APPOINTMENT_NOT_FOUND");
      if (!["PENDING", "CONFIRMED"].includes(old.status) || old.slot.startsAt <= input.now || old.slot.startsAt.getTime() - input.now.getTime() < old.slot.service.cancellationNoticeMinutes * 60_000) throw new Error("RESCHEDULE_POLICY");
      const next = await tx.appointmentSlot.findFirst({
        where: {
          id: input.slotId, serviceId: old.slot.serviceId, status: "AVAILABLE", deletedAt: null, startsAt: { gt: input.now },
          service: { isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } },
          AND: [{ OR: [{ doctorId: null, service: { requiresDoctor: false } }, { doctor: { is: { deletedAt: null, verificationStatus: "VERIFIED", serviceAssignments: { some: { serviceId: old.slot.serviceId, deletedAt: null } } } } }] }],
        },
        select: { id: true, version: true, startsAt: true, capacity: true, bookedCount: true, doctorId: true, service: { select: { requiresDoctor: true, bookingMode: true, approvalHoldMinutes: true, doctorAssignments: { where: { deletedAt: null }, select: { doctorId: true } } } } },
      });
      if (!next || (next.service.requiresDoctor && !next.doctorId) || (next.doctorId && !next.service.doctorAssignments.some((assignment) => assignment.doctorId === next.doctorId)) || next.id === old.slotId) throw new Error("SLOT_UNAVAILABLE");
      const claimed = await tx.appointmentSlot.updateMany({ where: { id: next.id, status: "AVAILABLE", version: next.version, startsAt: { gt: input.now }, bookedCount: { lt: next.capacity }, deletedAt: null }, data: { bookedCount: { increment: 1 }, version: { increment: 1 }, ...(next.bookedCount + 1 >= next.capacity ? { status: "FULL" } : {}) } });
      if (claimed.count !== 1) throw new Error("SLOT_UNAVAILABLE");
      const requiresApproval = next.service.bookingMode === "APPROVAL_REQUIRED";
      const newStatus = requiresApproval ? "PENDING" : "CONFIRMED";
      const holdExpiresAt = requiresApproval ? new Date(input.now.getTime() + Math.max(1, Math.min(next.service.approvalHoldMinutes, 1440)) * 60_000) : null;
      const moved = await tx.appointment.updateMany({ where: { id: old.id, patientId: input.patientId, status: old.status, slotId: old.slotId, deletedAt: null }, data: {
        slotId: next.id, status: newStatus, confirmedAt: newStatus === "CONFIRMED" ? input.now : null,
        cancelledAt: null, holdExpiresAt,
      } });
      if (moved.count !== 1) throw new Error("RESCHEDULE_POLICY");
      await releaseCapacity(tx, old.slot);
      await tx.appointmentStatusHistory.create({ data: { appointmentId: old.id, fromStatus: old.status, toStatus: newStatus, reason: "RESCHEDULED" } });
      await cancelReminders(tx, old.id);
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: input.patientId }, select: { userId: true } });
      await enqueueForUser(tx, patient.userId, old.id, newStatus === "CONFIRMED" ? "appointment.rescheduled" : "appointment.requested", input.now, newStatus === "CONFIRMED" ? next.startsAt : null, `${old.id}:reschedule:${input.now.toISOString()}`);
      await offerWaitlist(tx, old.slot, input.now);
      const response = await tx.appointment.findUniqueOrThrow({ where: { id: old.id }, select: appointmentView });
      await tx.idempotencyRecord.create({ data: {
        userId: input.userId, operation: "RESCHEDULE", keyHash: input.keyHash, requestHash: input.requestHash,
        appointmentId: old.id, expiresAt: new Date(input.now.getTime() + 24 * 60 * 60_000),
      } });
      return response;
    }, { isolationLevel: "Serializable" });
  }

  async decideBooking(input: { appointmentId: string; actorUserId: string; decision: "APPROVE" | "REJECT"; now: Date }): Promise<AppointmentResponseDto> {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({ where: { id: input.appointmentId, deletedAt: null }, select: {
        id: true, patientId: true, status: true, holdExpiresAt: true, slotId: true,
        slot: { select: { id: true, version: true, bookedCount: true, capacity: true, startsAt: true, serviceId: true, doctorId: true, locationId: true,
          service: { select: { organizationId: true, bookingMode: true } } } },
      } });
      if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");
      if (!await canManageAppointment(tx, input.actorUserId, appointment.slot.service.organizationId, appointment.slot.doctorId)) throw new Error("NOT_AUTHORIZED");
      if (appointment.status !== "PENDING" || appointment.slot.service.bookingMode !== "APPROVAL_REQUIRED") throw new Error("APPOINTMENT_NOT_PENDING");
      if (!appointment.holdExpiresAt || appointment.holdExpiresAt <= input.now) throw new Error("HOLD_EXPIRED");
      const nextStatus = input.decision === "APPROVE" ? "CONFIRMED" : "CANCELLED";
      const updated = await tx.appointment.updateMany({ where: { id: appointment.id, status: "PENDING", holdExpiresAt: { gt: input.now } }, data: {
        status: nextStatus, confirmedAt: nextStatus === "CONFIRMED" ? input.now : null,
        cancelledAt: nextStatus === "CANCELLED" ? input.now : null, holdExpiresAt: null,
      } });
      if (updated.count !== 1) throw new Error("APPOINTMENT_NOT_PENDING");
      if (nextStatus === "CANCELLED") await releaseCapacity(tx, appointment.slot);
      await tx.appointmentStatusHistory.create({ data: {
        appointmentId: appointment.id, fromStatus: "PENDING", toStatus: nextStatus,
        reason: input.decision === "APPROVE" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED", actorUserId: input.actorUserId,
      } });
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: appointment.patientId }, select: { userId: true } });
      await enqueueForUser(tx, patient.userId, appointment.id, nextStatus === "CONFIRMED" ? "appointment.confirmed" : "appointment.cancelled", input.now, nextStatus === "CONFIRMED" ? appointment.slot.startsAt : null);
      if (nextStatus === "CANCELLED") {
        await cancelReminders(tx, appointment.id);
        await offerWaitlist(tx, appointment.slot, input.now);
      }
      return tx.appointment.findUniqueOrThrow({ where: { id: appointment.id }, select: appointmentView });
    }, { isolationLevel: "Serializable" });
  }

  async listForProvider(userId: string, page: number, pageSize: number): Promise<{ items: AppointmentResponseDto[]; total: number }> {
    const actor = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null }, select: { role: true, doctorProfile: { select: { id: true, deletedAt: true } } } });
    if (!actor) throw new Error("NOT_AUTHORIZED");
    let where: Prisma.AppointmentWhereInput = { status: "PENDING", holdExpiresAt: { gt: new Date() }, deletedAt: null };
    if (actor.role !== "ADMIN") {
      const memberships = await prisma.organizationMember.findMany({ where: { userId, status: "ACTIVE", deletedAt: null, role: { in: ["OWNER", "ADMIN", "DOCTOR"] }, organization: { deletedAt: null } }, select: { organizationId: true, role: true } });
      const organizationIds = [...new Set(memberships.map((member) => member.organizationId))];
      if (!organizationIds.length) throw new Error("NOT_AUTHORIZED");
      const hasManagementRole = memberships.some((member) => member.role === "OWNER" || member.role === "ADMIN");
      if (!hasManagementRole && memberships.some((member) => member.role === "DOCTOR")) {
        if (!actor.doctorProfile || actor.doctorProfile.deletedAt) throw new Error("NOT_AUTHORIZED");
        where = { ...where, slot: { doctorId: actor.doctorProfile.id, service: { organizationId: { in: organizationIds } } } };
      } else where = { ...where, slot: { service: { organizationId: { in: organizationIds } } } };
    }
    const [items, total] = await prisma.$transaction([
      prisma.appointment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "asc" }, select: { ...appointmentView, holdExpiresAt: true } }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total };
  }

  async listForPatient(patientId: string, page: number, pageSize: number): Promise<{ items: AppointmentResponseDto[]; total: number }> {
    const where = { patientId, deletedAt: null } as const;
    const [items, total] = await prisma.$transaction([
      prisma.appointment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, select: appointmentView }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total };
  }
  getForPatient(appointmentId: string, patientId: string): Promise<AppointmentResponseDto | null> {
    return prisma.appointment.findFirst({ where: { id: appointmentId, patientId, deletedAt: null }, select: { ...appointmentView,
      statusHistory: { select: { fromStatus: true, toStatus: true, reason: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      payments: { select: { id: true, status: true, amount: true, currency: true, paidAt: true, createdAt: true } },
    } });
  }
}

export async function releaseCapacity(tx: Prisma.TransactionClient, slot: { id: string; version: number; bookedCount: number; capacity: number }): Promise<void> {
  const released = await tx.appointmentSlot.updateMany({
    where: { id: slot.id, version: slot.version, bookedCount: { gt: 0 }, deletedAt: null },
    data: { bookedCount: { decrement: 1 }, version: { increment: 1 }, status: "AVAILABLE" },
  });
  if (released.count !== 1) throw new Error("SLOT_CAPACITY_CONFLICT");
}

export async function enqueueForUser(tx: Prisma.TransactionClient, userId: string, appointmentId: string | null, templateKey: string, now: Date, startsAt: Date | null, dedupeNamespace = appointmentId ?? templateKey): Promise<void> {
  const [user, preference] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailLookupHash: true, emailCiphertext: true, emailVerified: true, phoneVerifiedAt: true } }),
    tx.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {}, select: { appointmentEmailEnabled: true, appointmentSmsEnabled: true, appointmentPushEnabled: true } }),
  ]);
  const rows: Prisma.NotificationCreateManyInput[] = [
    { userId, appointmentId, channel: "IN_APP", status: "SENT", sentAt: now, templateKey, dedupeKey: `${dedupeNamespace}:${templateKey}:in-app` },
  ];
  if (preference.appointmentEmailEnabled && user.emailVerified && Boolean(user.emailCiphertext || user.email)) rows.push({ userId, appointmentId, channel: "EMAIL", status: "QUEUED", templateKey, dedupeKey: `${dedupeNamespace}:${templateKey}:email` });
  if (preference.appointmentSmsEnabled && user.phoneVerifiedAt) rows.push({ userId, appointmentId, channel: "SMS", status: "QUEUED", templateKey, dedupeKey: `${dedupeNamespace}:${templateKey}:sms` });
  if (preference.appointmentPushEnabled && await tx.pushSubscription.count({ where: { userId, deletedAt: null } })) rows.push({ userId, appointmentId, channel: "PUSH", status: "QUEUED", templateKey, dedupeKey: `${dedupeNamespace}:${templateKey}:push` });

  if (startsAt && templateKey !== "appointment.requested" && templateKey !== "appointment.cancelled") {
    for (const [suffix, offset] of [["24h", REMINDER_24H_MS], ["1h", REMINDER_1H_MS]] as const) {
      const scheduledAt = new Date(startsAt.getTime() - offset);
      if (scheduledAt <= now) continue;
      const reminderKey = `appointment.reminder.${suffix}`;
      rows.push({ userId, appointmentId, channel: "IN_APP", status: "QUEUED", scheduledAt, templateKey: reminderKey, dedupeKey: `${dedupeNamespace}:${reminderKey}:${scheduledAt.toISOString()}:in-app` });
      if (preference.appointmentEmailEnabled && user.emailVerified && Boolean(user.emailCiphertext || user.email)) rows.push({ userId, appointmentId, channel: "EMAIL", status: "QUEUED", scheduledAt, templateKey: reminderKey, dedupeKey: `${dedupeNamespace}:${reminderKey}:${scheduledAt.toISOString()}:email` });
      if (preference.appointmentSmsEnabled && user.phoneVerifiedAt) rows.push({ userId, appointmentId, channel: "SMS", status: "QUEUED", scheduledAt, templateKey: reminderKey, dedupeKey: `${dedupeNamespace}:${reminderKey}:${scheduledAt.toISOString()}:sms` });
      if (preference.appointmentPushEnabled && await tx.pushSubscription.count({ where: { userId, deletedAt: null } })) rows.push({ userId, appointmentId, channel: "PUSH", status: "QUEUED", scheduledAt, templateKey: reminderKey, dedupeKey: `${dedupeNamespace}:${reminderKey}:${scheduledAt.toISOString()}:push` });
    }
  }
  await tx.notification.createMany({ data: rows, skipDuplicates: true });
}

async function cancelReminders(tx: Prisma.TransactionClient, appointmentId: string): Promise<void> {
  await tx.notification.updateMany({ where: { appointmentId, templateKey: { in: ["appointment.reminder.24h", "appointment.reminder.1h"] }, status: "QUEUED", deletedAt: null }, data: { status: "CANCELLED" } });
}

export async function offerWaitlist(tx: Prisma.TransactionClient, slot: { id: string; serviceId: string; doctorId: string | null; locationId: string | null; version: number; bookedCount: number; capacity: number; startsAt: Date }, now: Date): Promise<void> {
  const current = await tx.appointmentSlot.findUnique({ where: { id: slot.id }, select: { version: true, bookedCount: true, capacity: true, status: true } });
  if (!current || current.status !== "AVAILABLE" || current.bookedCount >= current.capacity) return;
  const entries = await tx.waitlistEntry.findMany({ where: {
    serviceId: slot.serviceId, status: "WAITING", deletedAt: null,
    earliestAt: { lte: slot.startsAt }, latestAt: { gte: slot.startsAt },
    ...(slot.doctorId ? { OR: [{ doctorId: null }, { doctorId: slot.doctorId }] } : { doctorId: null }),
    ...(slot.locationId ? { AND: [{ OR: [{ locationId: null }, { locationId: slot.locationId }] }] } : { locationId: null }),
  }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 20, select: { id: true, patientId: true, patient: { select: { userId: true } } } });
  for (const entry of entries) {
    const offerUntil = new Date(now.getTime() + 15 * 60_000);
    const held = await tx.appointmentSlot.updateMany({ where: { id: slot.id, version: current.version, status: "AVAILABLE", bookedCount: { lt: current.capacity } }, data: {
      bookedCount: { increment: 1 }, version: { increment: 1 }, ...(current.bookedCount + 1 >= current.capacity ? { status: "FULL" } : {}),
    } });
    if (held.count !== 1) return;
    const offered = await tx.waitlistEntry.updateMany({ where: { id: entry.id, status: "WAITING", deletedAt: null }, data: { status: "OFFERED", offeredSlotId: slot.id, offeredUntil: offerUntil } });
    if (offered.count !== 1) {
      await tx.appointmentSlot.updateMany({ where: { id: slot.id, version: current.version + 1 }, data: { bookedCount: { decrement: 1 }, version: { increment: 1 }, status: "AVAILABLE" } });
      return;
    }
    const userId = entry.patient.userId;
    await enqueueForUser(tx, userId, null, "waitlist.offer", now, null, `waitlist:${entry.id}`);
    return; // FIFO: only the first eligible patient is offered a slot.
  }
}

async function canManageAppointment(tx: Prisma.TransactionClient, actorUserId: string, organizationId: string, doctorId: string | null): Promise<boolean> {
  const actor = await tx.user.findFirst({ where: { id: actorUserId, status: "ACTIVE", deletedAt: null }, select: { role: true, doctorProfile: { select: { id: true, deletedAt: true } } } });
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  const membership = await tx.organizationMember.findFirst({ where: { userId: actorUserId, organizationId, status: "ACTIVE", deletedAt: null }, select: { role: true } });
  if (!membership) return false;
  if (membership.role === "OWNER" || membership.role === "ADMIN") return true;
  return membership.role === "DOCTOR" && Boolean(doctorId && actor.doctorProfile?.id === doctorId && !actor.doctorProfile.deletedAt);
}
