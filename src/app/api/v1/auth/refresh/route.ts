import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/http/route";
import { UnauthorizedError } from "@/lib/http/errors";
import { attachAuthCookies } from "@/lib/http/cookies";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest) => {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) throw new UnauthorizedError("لا توجد جلسة قابلة للتجديد");
  const tokens = await authService.refresh(refreshToken);
  return attachAuthCookies(NextResponse.json({ data: { accessExpiresIn: tokens.accessExpiresIn }, headers: { "cache-control": "no-store" } }), tokens);
});
