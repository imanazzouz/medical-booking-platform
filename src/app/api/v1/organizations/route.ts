import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { organizationCreateSchema } from "@/modules/directory/application/directory.dto";
import { directoryService } from "@/modules/directory/infrastructure/directory.module";

export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, organizationCreateSchema);
  const result = await directoryService.createOrganization(input, principal!);
  return success(result, 201);
}, { auth: true, roles: ["ADMIN"] });
