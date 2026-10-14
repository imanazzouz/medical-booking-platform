import { NextRequest } from "next/server";
import { z } from "zod";
import { API_KEY_SCOPES } from "@/lib/security/api-key";
import { ValidationError } from "@/lib/http/errors";
import { parseJson } from "@/lib/http/dto";
import { withApi } from "@/lib/http/route";
import { success } from "@/lib/http/response";
import { apiKeyService } from "@/modules/identity/infrastructure/api-key.module";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).max(10),
  expiresInDays: z.number().int().min(1).max(365).default(90),
}).strict();

export const GET = withApi(async (_request: NextRequest, principal) => {
  return success(await apiKeyService.list(principal!.id, principal!.authSource), 200, { "cache-control": "private, no-store" });
}, { auth: true });

export const POST = withApi(async (request: NextRequest, principal) => {
  const parsed = await parseJson(request, createSchema);
  if (new Set(parsed.scopes).size !== parsed.scopes.length) throw new ValidationError({ scopes: ["يجب ألا تتكرر النطاقات"] });
  const result = await apiKeyService.create({ ...parsed, userId: principal!.id, authSource: principal!.authSource });
  return success(result, 201, { "cache-control": "private, no-store" });
}, { auth: true });
