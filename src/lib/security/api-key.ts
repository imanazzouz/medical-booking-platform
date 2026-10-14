import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export const API_KEY_SCOPES = [
  "directory:read",
  "availability:read",
  "availability:manage",
  "booking:create",
  "booking:read",
  "booking:manage",
  "waitlist:manage",
  "notifications:read",
] as const;
export type ApiKeyScope = typeof API_KEY_SCOPES[number];
export interface IssuedApiKey { token: string; prefix: string; keyHash: string }

/** The bearer secret is returned exactly once; the database receives only an HMAC digest. */
export function issueApiKey(): IssuedApiKey {
  const prefix = `mbk_live_${randomBytes(6).toString("hex")}`;
  const token = `${prefix}_${randomBytes(32).toString("base64url")}`;
  return { token, prefix, keyHash: hashApiKey(token) };
}

export function hashApiKey(token: string): string {
  return createHmac("sha256", getEnv().API_KEY_PEPPER).update(`api-key:v1:${token}`).digest("hex");
}

export function constantTimeDigestEqual(actualHex: string, expectedHex: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actualHex) || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
