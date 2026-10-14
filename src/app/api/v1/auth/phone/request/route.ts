import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { phoneOtpSchema } from "@/modules/identity/application/auth.dto";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const userId = principal!.id;
  await enforceRateLimit("phone-otp-user", userId, 3, 60 * 60);
  const { phone } = await parseJson(request, phoneOtpSchema);
  const result = await authService.requestPhoneVerification(userId, phone);
  return success({ challengeId: result.challengeId, message: "أرسلنا رمز التحقق إلى الهاتف" }, 202);
}, { auth: true });
