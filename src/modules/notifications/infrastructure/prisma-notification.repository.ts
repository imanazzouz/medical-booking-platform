import { prisma } from "@/lib/db/prisma";
import type { NotificationRepository } from "@/modules/notifications/application/notification.ports";

export class PrismaNotificationRepository implements NotificationRepository {
  async listForUser(userId: string, page: number, pageSize: number) {
    const where = { userId, deletedAt: null } as const;
    const [items, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, select: { id: true, channel: true, status: true, templateKey: true, createdAt: true, sentAt: true, readAt: true } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, total, unreadCount };
  }
  async markRead(userId: string, notificationId: string, now: Date): Promise<boolean> {
    const result = await prisma.notification.updateMany({ where: { id: notificationId, userId, deletedAt: null, readAt: null }, data: { readAt: now } });
    if (result.count === 1) return true;
    const existing = await prisma.notification.findFirst({ where: { id: notificationId, userId, deletedAt: null, readAt: { not: null } }, select: { id: true } });
    return Boolean(existing); // Idempotent success for an already-read notification.
  }
}
