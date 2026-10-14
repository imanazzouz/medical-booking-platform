export interface PushSubscriptionInput {
  userId: string;
  endpointHash: string;
  endpointCiphertext: Buffer;
  endpointNonce: Buffer;
  endpointAuthTag: Buffer;
  p256dhCiphertext: Buffer;
  p256dhNonce: Buffer;
  p256dhAuthTag: Buffer;
  authCiphertext: Buffer;
  authNonce: Buffer;
  authAuthTag: Buffer;
  encryptionKeyVersion: string;
  expirationTime: Date | null;
}
export interface PushSubscriptionRepository {
  save(input: PushSubscriptionInput): Promise<void>;
  remove(userId: string, endpointHash: string, now: Date): Promise<boolean>;
}
