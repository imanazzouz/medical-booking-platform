import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { getEnv } from "@/lib/env";

export const GET = withApi(async () => {
  const env = getEnv();
  return success({ enabled: Boolean(env.VAPID_PUBLIC_KEY), publicKey: env.VAPID_PUBLIC_KEY ?? null }, 200, { "cache-control": "public, max-age=3600" });
});
