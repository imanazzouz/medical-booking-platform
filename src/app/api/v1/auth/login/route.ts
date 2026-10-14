import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { attachAuthCookies } from "@/lib/http/cookies";
import { success } from "@/lib/http/response";
import type { AuthLoginResponseDto } from "@/modules/identity/application/auth.dto";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/modules/identity/application/auth.dto";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceRateLimit("login-ip", ip, 15, 15 * 60);
  const input = await parseJson(request, loginSchema);
  await enforceRateLimit("login-email", input.email, 8, 15 * 60);
  const result = await authService.login(input);
  const body: AuthLoginResponseDto = { user: result.user, accessExpiresIn: result.tokens.accessExpiresIn };
  const response = success(body, 200, { "cache-control": "no-store" });
  return attachAuthCookies(response, result.tokens);
});
