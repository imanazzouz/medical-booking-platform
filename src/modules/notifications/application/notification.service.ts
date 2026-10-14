import { NotFoundError } from "@/lib/http/errors";
import type { NotificationRepository } from "@/modules/notifications/application/notification.ports";

export class NotificationService {
  constructor(private readonly repository: NotificationRepository, private readonly now: () => Date = () => new Date()) {}
  async listForUser(userId: string, page = 1, pageSize = 20) {
    const result = await this.repository.listForUser(userId, page, pageSize);
    return { ...result, page, pageSize };
  }
  async markRead(userId: string, notificationId: string) {
    if (!await this.repository.markRead(userId, notificationId, this.now())) throw new NotFoundError("الإشعار غير موجود");
    return { id: notificationId, read: true };
  }
}
