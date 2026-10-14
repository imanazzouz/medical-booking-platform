import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  OTP_PEPPER: z.string().min(32),
  LOOKUP_HMAC_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  API_KEY_PEPPER: z.string().min(32),
  FIELD_ENCRYPTION_KEY: z.string().min(40), // Legacy v1 key; retain until all v1 data has been rewrapped.
  FIELD_ENCRYPTION_KEYS_JSON: z.string().optional(), // Versioned base64 32-byte keys from a secret manager.
  FIELD_ENCRYPTION_ACTIVE_KEY_VERSION: z.string().regex(/^v[1-9][0-9]*$/).default("v1"),
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().email(),
  SMS_GATEWAY_URL: z.string().url().optional(),
  SMS_GATEWAY_TOKEN: z.string().min(1).optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().url().optional(),
}).superRefine((value, ctx) => {
  if (Boolean(value.UPSTASH_REDIS_REST_URL) !== Boolean(value.UPSTASH_REDIS_REST_TOKEN)) ctx.addIssue({ code: "custom", path: ["UPSTASH_REDIS_REST_TOKEN"], message: "Configure both Upstash REST URL and token together" });
  if (!value.REDIS_URL && !(value.UPSTASH_REDIS_REST_URL && value.UPSTASH_REDIS_REST_TOKEN)) ctx.addIssue({ code: "custom", path: ["REDIS_URL"], message: "Configure REDIS_URL or both Upstash REST values" });
  if (value.ACCESS_TOKEN_SECRET === value.REFRESH_TOKEN_SECRET) ctx.addIssue({ code: "custom", path: ["REFRESH_TOKEN_SECRET"], message: "Access and refresh signing keys must differ" });
  const decodeKey = (encoded: string): Buffer | null => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
    const decoded = Buffer.from(encoded, "base64");
    return decoded.length === 32 ? decoded : null;
  };
  const keys = new Map<string, string>([["v1", value.FIELD_ENCRYPTION_KEY]]);
  if (!decodeKey(value.FIELD_ENCRYPTION_KEY)) ctx.addIssue({ code: "custom", path: ["FIELD_ENCRYPTION_KEY"], message: "Must be Base64-encoded 32-byte key material" });
  if (value.FIELD_ENCRYPTION_KEYS_JSON) {
    try {
      const parsed: unknown = JSON.parse(value.FIELD_ENCRYPTION_KEYS_JSON);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      for (const [version, encoded] of Object.entries(parsed)) {
        if (!/^v[1-9][0-9]*$/.test(version) || typeof encoded !== "string" || !decodeKey(encoded)) throw new Error();
        keys.set(version, encoded);
      }
    } catch {
      ctx.addIssue({ code: "custom", path: ["FIELD_ENCRYPTION_KEYS_JSON"], message: "Must be a JSON map of version labels to Base64 32-byte keys" });
    }
  }
  if (!keys.has(value.FIELD_ENCRYPTION_ACTIVE_KEY_VERSION)) ctx.addIssue({ code: "custom", path: ["FIELD_ENCRYPTION_ACTIVE_KEY_VERSION"], message: "Active version must exist in the configured key ring" });
  if (value.NODE_ENV === "production" && new URL(value.APP_ORIGIN).protocol !== "https:") ctx.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "Production origin must use HTTPS" });
  const vapidConfigured = [value.VAPID_PUBLIC_KEY, value.VAPID_PRIVATE_KEY, value.VAPID_SUBJECT].some(Boolean);
  if (vapidConfigured && [value.VAPID_PUBLIC_KEY, value.VAPID_PRIVATE_KEY, value.VAPID_SUBJECT].some((key) => !key)) ctx.addIssue({ code: "custom", path: ["VAPID_PUBLIC_KEY"], message: "Configure all VAPID values together" });
});

export type AppEnv = z.infer<typeof envSchema>;
let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      // Never print actual environment values/secrets in configuration errors.
      throw new Error(`Invalid environment configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    }
    cached = result.data;
  }
  return cached;
}
