import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { createBookingSchema } from "@/modules/booking/application/booking.dto";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, createBookingSchema);
  const parsedKey = z.string().min(16).max(128).regex(/^[A-Za-z0-9._~-]+$/).safeParse(request.headers.get("idempotency-key"));
  if (!parsedKey.success) {
    const { ValidationError } = await import("@/lib/http/errors");
    throw new ValidationError({ "Idempotency-Key": ["مفتاح فريد بطول 16 إلى 128 حرفاً مطلوب"] });
  }
  const result = await bookingService.book(principal!.id, input.slotId, parsedKey.data);
  return success(result, 201, { "cache-control": "no-store" });
}, { auth: true, roles: ["PATIENT"], scopes: ["booking:create"] });
