import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { availabilityManagementService } from "@/modules/scheduling/infrastructure/availability.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await availabilityManagementService.createException(principal!.id, input), 201);
}, { auth: true, scopes: ["availability:manage"] });
