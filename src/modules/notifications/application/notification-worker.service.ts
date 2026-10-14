import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { logger } from "@/lib/observability/logger";
import type { NotificationJob, NotificationTransport, NotificationWorkerRepository } from "@/modules/notifications/application/notification-worker.ports";

const messages: Record<string, { subject: string; text: string }> = {
  "appointment.confirmed": { subject: "تم تأكيد موعدك", text: "تم تأكيد موعدك. سجّل الدخول إلى حسابك للاطلاع على التفاصيل." },
  "appointment.requested": { subject: "طلب حجزك قيد المراجعة", text: "استلمنا طلب الحجز. سجّل الدخول إلى حسابك لمتابعة حالته." },
  "appointment.cancelled": { subject: "تم إلغاء موعدك", text: "تم إلغاء موعدك. سجّل الدخول إلى حسابك لمراجعة مواعيدك." },
  "appointment.rescheduled": { subject: "تم تغيير موعدك", text: "تم تحديث موعدك. سجّل الدخول إلى حسابك للاطلاع على الوقت الجديد." },
  "appointment.expired": { subject: "انتهت مهلة طلب الحجز", text: "انتهت مهلة تأكيد طلبك وتم تحرير الفترة. يمكنك اختيار موعد آخر من حسابك." },
  "waitlist.joined": { subject: "تم تسجيلك في قائمة الانتظار", text: "سننبهك عند توفر موعد يناسب الفترة التي اخترتها." },
  "appointment.reminder.24h": { subject: "تذكير بموعدك غداً", text: "لديك موعد طبي خلال 24 ساعة. سجّل الدخول إلى حسابك للاطلاع على التفاصيل." },
  "appointment.reminder.1h": { subject: "تذكير بموعدك قريباً", text: "لديك موعد طبي خلال ساعة. سجّل الدخول إلى حسابك للاطلاع على التفاصيل." },
  "waitlist.offer": { subject: "توفر موعد في قائمة الانتظار", text: "أصبح موعد يناسب طلبك متاحاً. لديك 15 دقيقة لقبوله من حسابك." },
};

export class NotificationWorkerService {
  constructor(
    private readonly repository: NotificationWorkerRepository,
    private readonly transport: NotificationTransport,
    private readonly encryption: FieldEncryptionService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async processBatch(limit = 50): Promise<{ processed: number; failed: number }> {
    const jobs = await this.repository.claimQueued(this.now(), Math.min(Math.max(limit, 1), 100));
    let failed = 0;
    await Promise.all(jobs.map(async (job) => {
      try {
        await this.deliver(job);
        await this.repository.markSent(job.id, this.now());
      } catch (error) {
        failed += 1;
        await this.repository.retryOrFail(job.id, job.attemptCount, this.now());
        logger.warn({ notificationId: job.id, errorName: error instanceof Error ? error.name : "UnknownError" }, "notification delivery failed");
      }
    }));
    return { processed: jobs.length, failed };
  }

  private async deliver(job: NotificationJob): Promise<void> {
    const message = messages[job.templateKey] ?? { subject: "إشعار من المنصة الطبية", text: "لديك إشعار جديد. سجّل الدخول إلى حسابك للاطلاع عليه." };
    if (job.channel === "EMAIL") {
      if (!job.email) throw new Error("Notification recipient has no verified email");
      await this.transport.sendEmail(job.email, message.subject, message.text);
      return;
    }
    if (job.channel === "SMS") {
      if (!job.phoneCiphertext || !job.phoneNonce || !job.phoneAuthTag) throw new Error("Notification recipient has no verified phone");
      const phone = this.encryption.decrypt({ ciphertext: Buffer.from(job.phoneCiphertext), nonce: Buffer.from(job.phoneNonce), authTag: Buffer.from(job.phoneAuthTag), keyVersion: job.encryptionKeyVersion ?? "v1" }, `user:${job.userId}:phone`);
      await this.transport.sendSms(phone, message.text);
      return;
    }
    if (job.channel === "IN_APP") return; // The database-backed inbox is the delivery mechanism.
    if (job.channel === "PUSH") {
      for (const subscription of job.pushSubscriptions) {
        const endpoint = this.encryption.decrypt({ ciphertext: Buffer.from(subscription.endpointCiphertext), nonce: Buffer.from(subscription.endpointNonce), authTag: Buffer.from(subscription.endpointAuthTag), keyVersion: subscription.encryptionKeyVersion }, `push:${job.userId}:${subscription.endpointHash}:endpoint`);
        const p256dh = this.encryption.decrypt({ ciphertext: Buffer.from(subscription.p256dhCiphertext), nonce: Buffer.from(subscription.p256dhNonce), authTag: Buffer.from(subscription.p256dhAuthTag), keyVersion: subscription.encryptionKeyVersion }, `push:${job.userId}:${subscription.endpointHash}:p256dh`);
        const auth = this.encryption.decrypt({ ciphertext: Buffer.from(subscription.authCiphertext), nonce: Buffer.from(subscription.authNonce), authTag: Buffer.from(subscription.authAuthTag), keyVersion: subscription.encryptionKeyVersion }, `push:${job.userId}:${subscription.endpointHash}:auth`);
        try {
          await this.transport.sendPush({ endpoint, expirationTime: null, keys: { p256dh, auth } }, JSON.stringify({ title: message.subject, body: message.text, url: "/dashboard/patient" }));
        } catch (error) {
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) {
            await this.repository.removePushSubscription(subscription.id, this.now());
            continue;
          }
          throw error;
        }
      }
      return;
    }
    throw new Error("Unsupported notification channel");
  }
}
