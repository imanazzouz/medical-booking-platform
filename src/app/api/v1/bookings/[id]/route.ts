import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

export const GET = withApi(async (request: NextRequest, principal) => success(await bookingService.get(uuidPathParam(request, 1), principal!.id), 200, { "cache-control": "private, no-store" }), { auth: true, scopes: ["booking:read"] });
