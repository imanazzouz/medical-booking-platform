import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { ValidationError } from "@/lib/http/errors";
import { createBookingSchema } from "@/modules/booking/application/booking.dto";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, createBookingSchema);
  const key = request.headers.get("Idempotency-Key");
  if (!key) throw new ValidationError({ idempotencyKey: ["مفتاح Idempotency-Key مطلوب"] });
  return success(await bookingService.reschedule(uuidPathParam(request), input.slotId, key, principal!), 200, { "cache-control": "private, no-store" });
}, { auth: true, roles: ["PATIENT"], scopes: ["booking:manage"] });
