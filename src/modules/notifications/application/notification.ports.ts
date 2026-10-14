export interface NotificationRepository {
  listForUser(userId: string, page: number, pageSize: number): Promise<{ items: unknown[]; total: number; unreadCount: number }>;
  markRead(userId: string, notificationId: string, now: Date): Promise<boolean>;
}
