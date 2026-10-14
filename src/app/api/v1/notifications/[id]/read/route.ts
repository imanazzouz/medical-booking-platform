import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { notificationService } from "@/modules/notifications/infrastructure/notification.module";

export const POST = withApi(async (request: NextRequest, principal) => success(await notificationService.markRead(principal!.id, uuidPathParam(request, 2))), { auth: true, scopes: ["notifications:read"] });
