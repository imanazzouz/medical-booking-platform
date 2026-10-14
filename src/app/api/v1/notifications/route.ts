import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { ValidationError } from "@/lib/http/errors";
import { notificationService } from "@/modules/notifications/infrastructure/notification.module";
const schema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
export const GET = withApi(async (request: NextRequest, principal) => {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) throw new ValidationError(parsed.error.issues);
  return success(await notificationService.listForUser(principal!.id, parsed.data.page, parsed.data.pageSize), 200, { "cache-control": "private, no-store" });
}, { auth: true, scopes: ["notifications:read"] });
