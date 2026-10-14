import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { authService } from "@/modules/identity/infrastructure/auth.module";

const schema = z.object({ email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()) });
export const POST = withApi(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceRateLimit("otp-resend-ip", ip, 5, 60 * 60);
  const { email } = await parseJson(request, schema);
  await enforceRateLimit("otp-resend-email", email, 3, 60 * 60);
  await authService.resendRegistrationOtp(email);
  return success({ message: "إذا كان الحساب بحاجة إلى تحقق، فسيصل رمز جديد قريباً" }, 202);
});
