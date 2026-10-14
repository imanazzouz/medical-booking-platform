import { NextRequest } from "next/server";
import { uuidPathParam } from "@/lib/http/params";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { doctorUpdateSchema } from "@/modules/directory/application/directory.dto";
import { directoryService } from "@/modules/directory/infrastructure/directory.module";


export const GET = withApi(async (request) => {
  const identifier = request.nextUrl.pathname.split("/").at(-1) ?? "";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,179}$/.test(identifier)) {
    const { ValidationError } = await import("@/lib/http/errors");
    throw new ValidationError({ path: ["معرف الطبيب غير صالح"] });
  }
  return success(await directoryService.getDoctor(identifier));
}, { scopes: ["directory:read"] });
export const PATCH = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, doctorUpdateSchema);
  return success(await directoryService.updateDoctor(uuidPathParam(request, 1), input, principal!));
}, { auth: true });
export const DELETE = withApi(async (request: NextRequest, principal) => {
  await directoryService.deleteDoctor(uuidPathParam(request, 1), principal!);
  return success({ deleted: true });
}, { auth: true });
