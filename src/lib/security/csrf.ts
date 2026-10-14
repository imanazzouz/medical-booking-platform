import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

const TOKEN_VERSION = "v1";

/** Signed double-submit token: cookie is HttpOnly and the client echoes the returned token in a header. */
export function createCsrfToken(): string {
  const nonce = randomBytes(32).toString("base64url");
  const signature = sign(nonce);
  return `${TOKEN_VERSION}.${nonce}.${signature}`;
}

export function verifyCsrfToken(cookieValue: string | undefined, headerValue: string | null): boolean {
  if (!cookieValue || !headerValue || cookieValue.length > 180 || headerValue.length > 180) return false;
  const cookieBytes = Buffer.from(cookieValue, "utf8");
  const headerBytes = Buffer.from(headerValue, "utf8");
  if (cookieBytes.length !== headerBytes.length || !timingSafeEqual(cookieBytes, headerBytes)) return false;
  const [version, nonce, signature, extra] = cookieValue.split(".");
  if (version !== TOKEN_VERSION || !nonce || !signature || extra !== undefined || !/^[A-Za-z0-9_-]{40,50}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(sign(nonce), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sign(nonce: string): string {
  return createHmac("sha256", getEnv().CSRF_SECRET).update(`csrf:${TOKEN_VERSION}:${nonce}`).digest("hex");
}
