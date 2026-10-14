import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { searchSchema } from "@/modules/directory/application/directory.dto";
import { directoryService } from "@/modules/directory/infrastructure/directory.module";

export const GET = withApi(async (request: NextRequest) => {
  const parsed = searchSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    const { ValidationError } = await import("@/lib/http/errors");
    throw new ValidationError(parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  const result = await directoryService.search(parsed.data);
  return success({ ...result, page: parsed.data.page, pageSize: parsed.data.pageSize, totalPages: Math.ceil(result.total / parsed.data.pageSize) }, 200, { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" });
}, { scopes: ["directory:read"] });
