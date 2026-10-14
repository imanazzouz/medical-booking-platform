import { NextRequest } from "next/server";
import { z } from "zod";
import { uuidPathParam } from "@/lib/http/params";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { bookingService } from "@/modules/booking/infrastructure/booking.module";

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) }).strict();
export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, decisionSchema);
  return success(await bookingService.decide(uuidPathParam(request), principal!.id, input.decision), 200, { "cache-control": "private, no-store" });
}, { auth: true, scopes: ["booking:manage"] });
