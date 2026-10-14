import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

export interface Ciphertext { ciphertext: Buffer; nonce: Buffer; authTag: Buffer; keyVersion: string }

/** AES-256-GCM envelope encryption boundary with dual-read key rotation support. */
export class FieldEncryptionService {
  private key(version: string): Buffer {
    const env = getEnv();
    const ring: Record<string, string> = { v1: env.FIELD_ENCRYPTION_KEY };
    if (env.FIELD_ENCRYPTION_KEYS_JSON) Object.assign(ring, JSON.parse(env.FIELD_ENCRYPTION_KEYS_JSON) as Record<string, string>);
    const encoded = ring[version];
    if (!encoded) throw new Error(`Encryption key version ${version} is not configured`);
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error(`Encryption key version ${version} must decode to exactly 32 bytes`);
    return key;
  }

  encrypt(plaintext: string, aad: string): Ciphertext {
    const keyVersion = getEnv().FIELD_ENCRYPTION_ACTIVE_KEY_VERSION;
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(keyVersion), nonce);
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return { ciphertext, nonce, authTag: cipher.getAuthTag(), keyVersion };
  }

  decrypt(value: Ciphertext, aad: string): string {
    const decipher = createDecipheriv("aes-256-gcm", this.key(value.keyVersion || "v1"), value.nonce);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(value.authTag);
    return Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString("utf8");
  }
}
