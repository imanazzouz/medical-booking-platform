import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { verifyOtpSchema } from "@/modules/identity/application/auth.dto";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  await enforceRateLimit("phone-verify-user", principal!.id, 8, 15 * 60);
  const input = await parseJson(request, verifyOtpSchema);
  await enforceRateLimit("phone-verify-challenge", input.challengeId, 5, 15 * 60);
  await authService.verifyOtp(input, principal!.id);
  return success({ verified: true });
}, { auth: true });
