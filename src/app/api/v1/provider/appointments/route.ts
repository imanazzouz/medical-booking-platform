import { NextRequest } from "next/server";
import { z } from "zod";
import { ValidationError } from "@/lib/http/errors";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

const pageSchema = z.coerce.number().int().min(1).max(100_000);
const pageSizeSchema = z.coerce.number().int().min(1).max(50);

export const GET = withApi(async (request: NextRequest, principal) => {
  const page = pageSchema.safeParse(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = pageSizeSchema.safeParse(request.nextUrl.searchParams.get("pageSize") ?? "20");
  if (!page.success || !pageSize.success) throw new ValidationError({ query: ["قيم page أو pageSize غير صالحة"] });
  const result = await bookingService.listForProvider(principal!.id, page.data, pageSize.data);
  return success({ ...result, page: page.data, pageSize: pageSize.data }, 200, { "cache-control": "private, no-store" });
}, { auth: true, scopes: ["booking:manage"] });
