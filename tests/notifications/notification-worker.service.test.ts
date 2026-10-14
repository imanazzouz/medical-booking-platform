import { describe, expect, it, vi } from "vitest";
import { NotificationWorkerService } from "@/modules/notifications/application/notification-worker.service";
import type { NotificationJob, NotificationTransport, NotificationWorkerRepository } from "@/modules/notifications/application/notification-worker.ports";
import { FieldEncryptionService } from "@/lib/security/field-encryption";

const job: NotificationJob = { id: "n1", userId: "u1", channel: "EMAIL", templateKey: "appointment.confirmed", attemptCount: 1, email: "p@example.test", phoneCiphertext: null, phoneNonce: null, phoneAuthTag: null, encryptionKeyVersion: null, pushSubscriptions: [] };
describe("NotificationWorkerService", () => {
  it("delivers a queued email and acknowledges it", async () => {
    const repo = { claimQueued: vi.fn().mockResolvedValue([job]), markSent: vi.fn(), retryOrFail: vi.fn() } as unknown as NotificationWorkerRepository;
    const transport = { sendEmail: vi.fn(), sendSms: vi.fn() } as unknown as NotificationTransport;
    const worker = new NotificationWorkerService(repo, transport, {} as FieldEncryptionService);
    await expect(worker.processBatch()).resolves.toEqual({ processed: 1, failed: 0 });
    expect(transport.sendEmail).toHaveBeenCalledWith("p@example.test", "تم تأكيد موعدك", expect.stringContaining("سجّل الدخول"));
    expect(repo.markSent).toHaveBeenCalledOnce();
  });

  it("schedules retry without exposing provider errors", async () => {
    const repo = { claimQueued: vi.fn().mockResolvedValue([job]), markSent: vi.fn(), retryOrFail: vi.fn() } as unknown as NotificationWorkerRepository;
    const transport = { sendEmail: vi.fn().mockRejectedValue(new Error("secret SMTP detail")), sendSms: vi.fn() } as unknown as NotificationTransport;
    const worker = new NotificationWorkerService(repo, transport, {} as FieldEncryptionService);
    await expect(worker.processBatch()).resolves.toEqual({ processed: 1, failed: 1 });
    expect(repo.retryOrFail).toHaveBeenCalledWith("n1", 1, expect.any(Date));
  });
});
