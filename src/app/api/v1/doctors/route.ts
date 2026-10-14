import { NextRequest } from "next/server";
import { withApi } from "@/lib/http/route";
import { parseJson } from "@/lib/http/dto";
import { success } from "@/lib/http/response";
import { doctorCreateSchema } from "@/modules/directory/application/directory.dto";
import { directoryService } from "@/modules/directory/infrastructure/directory.module";
import { z } from "zod";
const listSchema = z.object({ specialty: z.string().max(80).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export const GET = withApi(async (request: NextRequest) => {
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    const { ValidationError } = await import("@/lib/http/errors");
    throw new ValidationError(parsed.error.issues);
  }
  return success(await directoryService.listDoctors(parsed.data));
}, { scopes: ["directory:read"] });
export const POST = withApi(async (request: NextRequest, principal) => {
  const input = await parseJson(request, doctorCreateSchema);
  return success(await directoryService.createDoctor(input, principal!), 201);
}, { auth: true, roles: ["ADMIN"] });
