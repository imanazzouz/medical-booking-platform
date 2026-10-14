import { createHmac } from "node:crypto";
import { z } from "zod";
import { ValidationError } from "@/lib/http/errors";
import { getEnv } from "@/lib/env";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import type { PushSubscriptionRepository } from "@/modules/notifications/application/push-subscription.ports";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().int().positive().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(32).max(256), auth: z.string().min(16).max(128) }).strict(),
}).strict();

/**
 * Persist browser subscriptions encrypted-at-rest. Only well-known browser push
 * service hosts are accepted: web-push endpoints otherwise create an SSRF proxy.
 */
export class PushSubscriptionService {
  constructor(private readonly repository: PushSubscriptionRepository, private readonly encryption: FieldEncryptionService, private readonly now: () => Date = () => new Date()) {}

  async subscribe(userId: string, raw: unknown): Promise<{ subscribed: true }> {
    const parsed = subscriptionSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const { endpoint, keys, expirationTime } = parsed.data;
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.port && url.port !== "443" || url.username || url.password || !isAllowedPushHost(url.hostname)) {
      throw new ValidationError({ endpoint: ["نقطة Web Push غير مسموحة"] });
    }
    const endpointHash = hashEndpoint(endpoint);
    const aad = (field: string) => `push:${userId}:${endpointHash}:${field}`;
    const endpointCipher = this.encryption.encrypt(endpoint, aad("endpoint"));
    const p256dhCipher = this.encryption.encrypt(keys.p256dh, aad("p256dh"));
    const authCipher = this.encryption.encrypt(keys.auth, aad("auth"));
    await this.repository.save({
      userId, endpointHash,
      endpointCiphertext: endpointCipher.ciphertext, endpointNonce: endpointCipher.nonce, endpointAuthTag: endpointCipher.authTag,
      p256dhCiphertext: p256dhCipher.ciphertext, p256dhNonce: p256dhCipher.nonce, p256dhAuthTag: p256dhCipher.authTag,
      authCiphertext: authCipher.ciphertext, authNonce: authCipher.nonce, authAuthTag: authCipher.authTag,
      encryptionKeyVersion: endpointCipher.keyVersion,
      expirationTime: expirationTime ? new Date(expirationTime) : null,
    });
    return { subscribed: true };
  }

  async unsubscribe(userId: string, raw: unknown): Promise<{ removed: boolean }> {
    const parsed = z.object({ endpoint: z.string().url().max(2048) }).strict().safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const url = new URL(parsed.data.endpoint);
    if (url.protocol !== "https:" || !isAllowedPushHost(url.hostname)) throw new ValidationError({ endpoint: ["نقطة Web Push غير مسموحة"] });
    return { removed: await this.repository.remove(userId, hashEndpoint(parsed.data.endpoint), this.now()) };
  }
}

function hashEndpoint(endpoint: string): string {
  return createHmac("sha256", getEnv().LOOKUP_HMAC_SECRET).update(endpoint).digest("hex");
}

function isAllowedPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "fcm.googleapis.com" || host === "web.push.apple.com" || host === "push.services.mozilla.com" || host === "updates.push.services.mozilla.com" || host.endsWith(".push.services.mozilla.com") || host === "notify.windows.com" || host.endsWith(".notify.windows.com");
}
