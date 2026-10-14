import { prisma } from "@/lib/db/prisma";
import type { NotificationPreferences, NotificationPreferencesRepository } from "@/modules/notifications/application/notification-preferences.ports";

const selection = { appointmentEmailEnabled: true, appointmentSmsEnabled: true, appointmentPushEnabled: true } as const;
export class PrismaNotificationPreferencesRepository implements NotificationPreferencesRepository {
  async get(userId: string): Promise<NotificationPreferences> {
    const prefs = await prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {}, select: selection });
    return prefs;
  }
  async update(userId: string, values: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...values }, update: values, select: selection });
  }
  async hasVerifiedEmail(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null, emailVerified: { not: null } }, select: { id: true } });
    return Boolean(user);
  }
  async hasVerifiedPhone(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null, phoneVerifiedAt: { not: null } }, select: { id: true } });
    return Boolean(user);
  }
  async hasPushSubscription(userId: string): Promise<boolean> {
    return Boolean(await prisma.pushSubscription.findFirst({ where: { userId, deletedAt: null, OR: [{ expirationTime: null }, { expirationTime: { gt: new Date() } }] }, select: { id: true } }));
  }
}
