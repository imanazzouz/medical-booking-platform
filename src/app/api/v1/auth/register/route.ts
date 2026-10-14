import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { registerSchema } from "@/modules/identity/application/auth.dto";
import { authService } from "@/modules/identity/infrastructure/auth.module";

export const POST = withApi(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  await enforceRateLimit("register-ip", ip, 5, 60 * 60);
  const input = await parseJson(request, registerSchema);
  await enforceRateLimit("register-email", input.email, 3, 60 * 60);
  const result = await authService.registerPatient(input);
  return success({ challengeId: result.challengeId, message: "أرسلنا رمز التحقق إلى بريدك الإلكتروني" }, 202);
});
