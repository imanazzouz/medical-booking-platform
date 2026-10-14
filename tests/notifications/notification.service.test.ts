import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "@/modules/notifications/application/notification.service";
import type { NotificationRepository } from "@/modules/notifications/application/notification.ports";
import { NotFoundError } from "@/lib/http/errors";

describe("NotificationService", () => {
  it("returns the signed-in user's notification page", async () => {
    const repository = { listForUser: vi.fn().mockResolvedValue({ items: [{ id: "n1" }], total: 1, unreadCount: 1 }) } as unknown as NotificationRepository;
    const service = new NotificationService(repository);
    await expect(service.listForUser("u1", 1, 10)).resolves.toMatchObject({ items: [{ id: "n1" }], total: 1, unreadCount: 1, page: 1 });
  });

  it("does not mark an inaccessible notification as read", async () => {
    const repository = { markRead: vi.fn().mockResolvedValue(false) } as unknown as NotificationRepository;
    const service = new NotificationService(repository);
    await expect(service.markRead("u1", "n1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
