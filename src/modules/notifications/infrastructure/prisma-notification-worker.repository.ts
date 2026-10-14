import { prisma } from "@/lib/db/prisma";
import type { NotificationJob, NotificationWorkerRepository } from "@/modules/notifications/application/notification-worker.ports";
import { FieldEncryptionService } from "@/lib/security/field-encryption";

const fieldEncryption = new FieldEncryptionService();

export class PrismaNotificationWorkerRepository implements NotificationWorkerRepository {
  async claimQueued(now: Date, limit: number): Promise<NotificationJob[]> {
    return prisma.$transaction(async (tx) => {
      await tx.notification.updateMany({ where: { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) }, deletedAt: null }, data: { status: "QUEUED", scheduledAt: now } });
      const candidates = await tx.notification.findMany({ where: { status: "QUEUED", deletedAt: null, OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true } });
      const claimed: NotificationJob[] = [];
      for (const candidate of candidates) {
        const claim = await tx.notification.updateMany({ where: { id: candidate.id, status: "QUEUED", deletedAt: null }, data: { status: "SENDING", attemptCount: { increment: 1 } } });
        if (claim.count !== 1) continue;
        const row = await tx.notification.findUniqueOrThrow({ where: { id: candidate.id }, select: {
          id: true, userId: true, channel: true, templateKey: true, attemptCount: true,
          user: { select: {
            email: true, emailLookupHash: true, emailCiphertext: true, emailNonce: true, emailAuthTag: true, emailEncryptionKeyVersion: true,
            emailVerified: true, phoneVerifiedAt: true, phoneCiphertext: true, phoneNonce: true, phoneAuthTag: true, encryptionKeyVersion: true,
            notificationPreference: { select: { appointmentEmailEnabled: true, appointmentSmsEnabled: true, appointmentPushEnabled: true } },
            pushSubscriptions: { where: { deletedAt: null, OR: [{ expirationTime: null }, { expirationTime: { gt: now } }] }, select: {
              id: true, endpointHash: true, endpointCiphertext: true, endpointNonce: true, endpointAuthTag: true,
              p256dhCiphertext: true, p256dhNonce: true, p256dhAuthTag: true,
              authCiphertext: true, authNonce: true, authAuthTag: true, encryptionKeyVersion: true,
            } },
          } },
        } });
        const preference = row.user.notificationPreference;
        const eligible = row.channel === "IN_APP" ||
          (row.channel === "EMAIL" && Boolean((row.user.emailCiphertext || row.user.email) && row.user.emailVerified && preference?.appointmentEmailEnabled)) ||
          (row.channel === "SMS" && Boolean(row.user.phoneVerifiedAt && row.user.phoneCiphertext && preference?.appointmentSmsEnabled)) ||
          (row.channel === "PUSH" && Boolean(preference?.appointmentPushEnabled && row.user.pushSubscriptions.length));
        if (!eligible) {
          await tx.notification.updateMany({ where: { id: row.id, status: "SENDING" }, data: { status: "CANCELLED" } });
          continue;
        }
        const email = row.user.emailVerified
          ? row.user.emailCiphertext && row.user.emailNonce && row.user.emailAuthTag && row.user.emailEncryptionKeyVersion
            ? fieldEncryption.decrypt({ ciphertext: Buffer.from(row.user.emailCiphertext), nonce: Buffer.from(row.user.emailNonce), authTag: Buffer.from(row.user.emailAuthTag), keyVersion: row.user.emailEncryptionKeyVersion }, `user:${row.userId}:email`)
            : row.user.email
          : null;
        claimed.push({
          id: row.id, userId: row.userId, channel: row.channel, templateKey: row.templateKey, attemptCount: row.attemptCount,
          email,
          phoneCiphertext: row.user.phoneCiphertext, phoneNonce: row.user.phoneNonce,
          phoneAuthTag: row.user.phoneAuthTag, encryptionKeyVersion: row.user.encryptionKeyVersion,
          pushSubscriptions: row.user.pushSubscriptions,
        });
      }
      return claimed;
    }, { isolationLevel: "ReadCommitted" });
  }
  async markSent(id: string, now: Date): Promise<void> {
    await prisma.notification.updateMany({ where: { id, status: "SENDING" }, data: { status: "SENT", sentAt: now } });
  }
  async retryOrFail(id: string, attemptCount: number, now: Date): Promise<void> {
    const exhausted = attemptCount >= 5;
    const delaySeconds = Math.min(60 * 60, 2 ** Math.min(attemptCount, 10) * 30);
    await prisma.notification.updateMany({ where: { id, status: "SENDING" }, data: { status: exhausted ? "FAILED" : "QUEUED", scheduledAt: exhausted ? null : new Date(now.getTime() + delaySeconds * 1000) } });
  }
  async removePushSubscription(id: string, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.pushSubscription.findFirst({ where: { id, deletedAt: null }, select: { userId: true } });
      if (!existing) return;
      await tx.pushSubscription.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
      const remaining = await tx.pushSubscription.count({ where: { userId: existing.userId, deletedAt: null } });
      if (remaining === 0) await tx.notificationPreference.updateMany({ where: { userId: existing.userId }, data: { appointmentPushEnabled: false } });
    });
  }
}
