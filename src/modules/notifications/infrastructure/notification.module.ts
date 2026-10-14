import { NotificationService } from "@/modules/notifications/application/notification.service";
import { PrismaNotificationRepository } from "@/modules/notifications/infrastructure/prisma-notification.repository";
import { NotificationPreferencesService } from "@/modules/notifications/application/notification-preferences.service";
import { PrismaNotificationPreferencesRepository } from "@/modules/notifications/infrastructure/prisma-notification-preferences.repository";
import { PushSubscriptionService } from "@/modules/notifications/application/push-subscription.service";
import { PrismaPushSubscriptionRepository } from "@/modules/notifications/infrastructure/prisma-push-subscription.repository";
import { FieldEncryptionService } from "@/lib/security/field-encryption";

export const notificationService = new NotificationService(new PrismaNotificationRepository());
export const notificationPreferencesService = new NotificationPreferencesService(new PrismaNotificationPreferencesRepository());
export const pushSubscriptionService = new PushSubscriptionService(new PrismaPushSubscriptionRepository(), new FieldEncryptionService());
