import { z } from "zod";
import type { NextRequest } from "next/server";
import { ValidationError } from "@/lib/http/errors";

export function uuidPathParam(request: NextRequest, positionFromEnd = 1): string {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const value = parts.at(-positionFromEnd);
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError({ path: ["معرف المورد غير صالح"] });
  return parsed.data;
}
