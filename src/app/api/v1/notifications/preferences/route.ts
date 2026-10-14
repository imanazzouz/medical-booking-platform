import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { notificationPreferencesService } from "@/modules/notifications/infrastructure/notification.module";

export const GET = withApi(async (_request: NextRequest, principal) => success(await notificationPreferencesService.get(principal!.id), 200, { "cache-control": "private, no-store" }), { auth: true });
export const PATCH = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await notificationPreferencesService.update(principal!.id, input), 200, { "cache-control": "private, no-store" });
}, { auth: true });
