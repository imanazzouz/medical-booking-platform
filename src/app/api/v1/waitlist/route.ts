import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { waitlistService } from "@/modules/booking/infrastructure/booking.module";

export const GET = withApi(async (_request: NextRequest, principal) => success(await waitlistService.list(principal!.id), 200, { "cache-control": "private, no-store" }), { auth: true, roles: ["PATIENT"], scopes: ["waitlist:manage"] });
export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await waitlistService.join(principal!.id, input), 201, { "cache-control": "private, no-store" });
}, { auth: true, roles: ["PATIENT"], scopes: ["waitlist:manage"] });
