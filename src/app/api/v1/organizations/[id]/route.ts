import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { organizationUpdateSchema } from "@/modules/directory/application/directory.dto";
import { directoryService } from "@/modules/directory/infrastructure/directory.module";


export const GET = withApi(async (request) => success(await directoryService.getOrganization(uuidPathParam(request, 1))));
export const PATCH = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, organizationUpdateSchema);
  return success(await directoryService.updateOrganization(uuidPathParam(request, 1), input, principal!));
}, { auth: true });
export const DELETE = withApi(async (request: NextRequest, principal) => {
  await directoryService.deleteOrganization(uuidPathParam(request, 1), principal!);
  return success({ deleted: true }, 200);
}, { auth: true });
