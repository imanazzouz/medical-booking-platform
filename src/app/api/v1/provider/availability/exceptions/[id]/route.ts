import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { uuidPathParam } from "@/lib/http/params";
import { availabilityManagementService } from "@/modules/scheduling/infrastructure/availability.module";

export const DELETE = withApi(async (request: NextRequest, principal) => {
  return success(await availabilityManagementService.deleteException(principal!.id, uuidPathParam(request)));
}, { auth: true, scopes: ["availability:manage"] });
