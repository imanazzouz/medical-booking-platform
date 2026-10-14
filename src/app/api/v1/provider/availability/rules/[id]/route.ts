import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { uuidPathParam } from "@/lib/http/params";
import { availabilityManagementService } from "@/modules/scheduling/infrastructure/availability.module";

export const PUT = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  const result = await availabilityManagementService.replaceRule(principal!.id, uuidPathParam(request), input);
  return success(result);
}, { auth: true, scopes: ["availability:manage"] });

export const DELETE = withApi(async (request: NextRequest, principal) => {
  return success(await availabilityManagementService.deleteRule(principal!.id, uuidPathParam(request)));
}, { auth: true, scopes: ["availability:manage"] });
