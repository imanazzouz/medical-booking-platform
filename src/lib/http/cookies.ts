import { NextResponse } from "next/server";
import type { TokenPair } from "@/lib/security/jwt";

const secure = process.env.NODE_ENV === "production";
export function attachAuthCookies(response: NextResponse, tokens: TokenPair) {
  response.cookies.set("access_token", tokens.accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: tokens.accessExpiresIn });
  response.cookies.set("refresh_token", tokens.refreshToken, { httpOnly: true, secure, sameSite: "strict", path: "/api/v1/auth", maxAge: 30 * 24 * 60 * 60 });
  return response;
}
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set("access_token", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { httpOnly: true, secure, sameSite: "strict", path: "/api/v1/auth", maxAge: 0 });
  return response;
}
