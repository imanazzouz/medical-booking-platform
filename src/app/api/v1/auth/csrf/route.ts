import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { createCsrfToken } from "@/lib/security/csrf";
import { getEnv } from "@/lib/env";

export const GET = withApi(async () => {
  const token = createCsrfToken();
  const response = success({ token }, 200, { "cache-control": "no-store" });
  response.cookies.set("csrf_token", token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 2 * 60 * 60,
  });
  return response;
});
