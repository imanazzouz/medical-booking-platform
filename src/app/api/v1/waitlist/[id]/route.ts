import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { waitlistService } from "@/modules/booking/infrastructure/booking.module";

export const DELETE = withApi(async (request: NextRequest, principal) => success(await waitlistService.leave(principal!.id, uuidPathParam(request)), 200, { "cache-control": "private, no-store" }), { auth: true, roles: ["PATIENT"], scopes: ["waitlist:manage"] });
