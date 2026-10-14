import { z } from "zod";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import type { NotificationPreferencesRepository } from "@/modules/notifications/application/notification-preferences.ports";

const preferencesSchema = z.object({
  appointmentEmailEnabled: z.boolean().optional(),
  appointmentSmsEnabled: z.boolean().optional(),
  appointmentPushEnabled: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one preference is required");

export class NotificationPreferencesService {
  constructor(private readonly repository: NotificationPreferencesRepository) {}
  async get(userId: string) { return this.repository.get(userId); }
  async update(userId: string, raw: unknown) {
    const parsed = preferencesSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    if (parsed.data.appointmentSmsEnabled && !await this.repository.hasVerifiedPhone(userId)) throw new ForbiddenError("تحقق من رقم هاتفك قبل تفعيل الرسائل النصية");
    if (parsed.data.appointmentEmailEnabled && !await this.repository.hasVerifiedEmail(userId)) throw new ForbiddenError("تحقق من بريدك الإلكتروني قبل تفعيل البريد");
    if (parsed.data.appointmentPushEnabled && !await this.repository.hasPushSubscription(userId)) throw new ForbiddenError("فعّل إشعارات المتصفح أولاً");
    return this.repository.update(userId, parsed.data);
  }
}
