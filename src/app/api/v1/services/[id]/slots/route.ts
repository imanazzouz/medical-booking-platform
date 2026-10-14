import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { availabilityService } from "@/modules/scheduling/infrastructure/availability.module";


export const GET = withApi(async (request: NextRequest) => {
  const result = await availabilityService.list(uuidPathParam(request, 2), Object.fromEntries(request.nextUrl.searchParams.entries()));
  return success(result, 200, { "cache-control": "public, s-maxage=15, stale-while-revalidate=30" });
}, { scopes: ["availability:read"] });
