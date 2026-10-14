export interface NotificationPreferences {
  appointmentEmailEnabled: boolean;
  appointmentSmsEnabled: boolean;
  appointmentPushEnabled: boolean;
}
export interface NotificationPreferencesRepository {
  get(userId: string): Promise<NotificationPreferences>;
  update(userId: string, values: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  hasVerifiedEmail(userId: string): Promise<boolean>;
  hasVerifiedPhone(userId: string): Promise<boolean>;
  hasPushSubscription(userId: string): Promise<boolean>;
}
