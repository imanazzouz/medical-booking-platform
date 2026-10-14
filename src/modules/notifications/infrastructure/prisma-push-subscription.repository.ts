import { prisma } from "@/lib/db/prisma";
import type { PushSubscriptionInput, PushSubscriptionRepository } from "@/modules/notifications/application/push-subscription.ports";

const bytes = (value: Buffer) => Uint8Array.from(value);
export class PrismaPushSubscriptionRepository implements PushSubscriptionRepository {
  async save(input: PushSubscriptionInput): Promise<void> {
    const data = {
      userId: input.userId, endpointHash: input.endpointHash,
      endpointCiphertext: bytes(input.endpointCiphertext), endpointNonce: bytes(input.endpointNonce), endpointAuthTag: bytes(input.endpointAuthTag),
      p256dhCiphertext: bytes(input.p256dhCiphertext), p256dhNonce: bytes(input.p256dhNonce), p256dhAuthTag: bytes(input.p256dhAuthTag),
      authCiphertext: bytes(input.authCiphertext), authNonce: bytes(input.authNonce), authAuthTag: bytes(input.authAuthTag),
      encryptionKeyVersion: input.encryptionKeyVersion, expirationTime: input.expirationTime,
    };
    await prisma.$transaction(async (tx) => {
      await tx.pushSubscription.upsert({
        where: { userId_endpointHash: { userId: input.userId, endpointHash: input.endpointHash } },
        create: data,
        update: { ...data, deletedAt: null },
      });
      await tx.notificationPreference.upsert({ where: { userId: input.userId }, create: { userId: input.userId, appointmentPushEnabled: true }, update: { appointmentPushEnabled: true } });
    }, { isolationLevel: "Serializable" });
  }
  async remove(userId: string, endpointHash: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.pushSubscription.updateMany({ where: { userId, endpointHash, deletedAt: null }, data: { deletedAt: now } });
      const remaining = await tx.pushSubscription.count({ where: { userId, deletedAt: null } });
      if (remaining === 0) await tx.notificationPreference.updateMany({ where: { userId }, data: { appointmentPushEnabled: false } });
      return result.count > 0;
    });
  }
}
