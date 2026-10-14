import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export function normalizeIdentifier(value: string): string { return value.trim().toLowerCase(); }
export function identifierHash(value: string): string {
  return createHmac("sha256", getEnv().LOOKUP_HMAC_SECRET).update(normalizeIdentifier(value)).digest("hex");
}
export function createOtp(): string { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
export function otpHash(code: string, challengeId: string): string {
  return createHmac("sha256", getEnv().OTP_PEPPER).update(`${challengeId}:${code}`).digest("hex");
}
export function constantTimeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
