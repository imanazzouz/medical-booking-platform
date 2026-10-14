import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { verifyOtpSchema } from "@/modules/identity/application/auth.dto";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceRateLimit("otp-verify-ip", ip, 15, 15 * 60);
  const input = await parseJson(request, verifyOtpSchema);
  await enforceRateLimit("otp-verify-challenge", input.challengeId, 5, 15 * 60);
  await authService.verifyOtp(input);
  return success({ verified: true });
});
