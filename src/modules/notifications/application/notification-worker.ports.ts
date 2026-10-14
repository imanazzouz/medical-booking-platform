import type { NotificationChannel } from "@prisma/client";
export interface EncryptedPushSubscription {
  id: string;
  endpointHash: string;
  endpointCiphertext: Uint8Array;
  endpointNonce: Uint8Array;
  endpointAuthTag: Uint8Array;
  p256dhCiphertext: Uint8Array;
  p256dhNonce: Uint8Array;
  p256dhAuthTag: Uint8Array;
  authCiphertext: Uint8Array;
  authNonce: Uint8Array;
  authAuthTag: Uint8Array;
  encryptionKeyVersion: string;
}
export interface NotificationJob { id: string; userId: string; channel: NotificationChannel; templateKey: string; attemptCount: number; email: string | null; phoneCiphertext: Uint8Array | null; phoneNonce: Uint8Array | null; phoneAuthTag: Uint8Array | null; encryptionKeyVersion: string | null; pushSubscriptions: EncryptedPushSubscription[] }
export interface NotificationWorkerRepository {
  claimQueued(now: Date, limit: number): Promise<NotificationJob[]>;
  markSent(id: string, now: Date): Promise<void>;
  retryOrFail(id: string, attemptCount: number, now: Date): Promise<void>;
  removePushSubscription(id: string, now: Date): Promise<void>;
}
export interface NotificationTransport {
  sendEmail(to: string, subject: string, text: string): Promise<void>;
  sendSms(to: string, text: string): Promise<void>;
  sendPush(subscription: { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }, payload: string): Promise<void>;
}
