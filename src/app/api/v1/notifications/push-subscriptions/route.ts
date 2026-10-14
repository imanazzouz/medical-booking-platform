import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { pushSubscriptionService } from "@/modules/notifications/infrastructure/notification.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await pushSubscriptionService.subscribe(principal!.id, input), 201);
}, { auth: true });

export const DELETE = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await pushSubscriptionService.unsubscribe(principal!.id, input));
}, { auth: true });
