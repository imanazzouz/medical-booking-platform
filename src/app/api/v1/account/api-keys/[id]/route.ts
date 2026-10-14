import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { apiKeyService } from "@/modules/identity/infrastructure/api-key.module";

export const DELETE = withApi(async (request: NextRequest, principal) => {
  return success(await apiKeyService.revoke(principal!.id, uuidPathParam(request), principal!.authSource), 200, { "cache-control": "private, no-store" });
}, { auth: true });
