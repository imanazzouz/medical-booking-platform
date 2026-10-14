import { NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

/** Transport security headers and request correlation; resource authorization remains in API guards. */
export function middleware(request: NextRequest) {
  const supplied = request.headers.get("x-request-id") ?? "";
  const requestId = /^[A-Za-z0-9_-]{1,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const nonce = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  const production = process.env.NODE_ENV === "production";
  const csp = buildContentSecurityPolicy(nonce, production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the request CSP nonce and applies it to framework-generated inline scripts.
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (production) response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
