import { z } from "zod";
import { ValidationError } from "@/lib/http/errors";

export async function parseJson<T extends z.ZodTypeAny>(request: Request, schema: T, maxBytes = 32 * 1024): Promise<z.infer<T>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new ValidationError({ body: ["حجم الطلب أكبر من الحد المسموح"] });
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError({ form: ["JSON body is required"] });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ValidationError({ body: ["حجم الطلب أكبر من الحد المسموح"] });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let raw: unknown;
  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw new ValidationError({ form: ["JSON body is malformed"] }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
  }
  return parsed.data;
}

export const uuidSchema = z.string().uuid();
