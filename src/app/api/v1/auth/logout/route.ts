import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/http/route";
import { clearAuthCookies } from "@/lib/http/cookies";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest) => {
  await authService.logout(request.cookies.get("refresh_token")?.value);
  return clearAuthCookies(NextResponse.json({ data: { loggedOut: true } }, { headers: { "cache-control": "no-store" } }));
});
