import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

export const POST = withApi(async (request: NextRequest, principal) => success(await bookingService.cancel(uuidPathParam(request, 2), principal!), 200, { "cache-control": "no-store" }), { auth: true, roles: ["PATIENT"], scopes: ["booking:manage"] });
