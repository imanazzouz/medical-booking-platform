import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { ValidationError } from "@/lib/http/errors";
import { success } from "@/lib/http/response";
import { availabilityManagementService } from "@/modules/scheduling/infrastructure/availability.module";

export const GET = withApi(async (request: NextRequest, principal) => {
  const serviceId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("serviceId"));
  if (!serviceId.success) throw new ValidationError({ serviceId: ["معرف الخدمة غير صالح"] });
  return success({ rules: await availabilityManagementService.listRules(principal!.id, serviceId.data) });
}, { auth: true, scopes: ["availability:manage"] });

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, z.unknown());
  return success(await availabilityManagementService.createRule(principal!.id, input), 201);
}, { auth: true, scopes: ["availability:manage"] });
