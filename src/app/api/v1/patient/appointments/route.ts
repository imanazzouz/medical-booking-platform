import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";
import { ValidationError } from "@/lib/http/errors";
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export const GET = withApi(async (request: NextRequest, principal) => {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) throw new ValidationError(parsed.error.issues);
  return success(await bookingService.list(principal!.id, parsed.data.page, parsed.data.pageSize), 200, { "cache-control": "private, no-store" });
}, { auth: true, roles: ["PATIENT"], scopes: ["booking:read"] });
