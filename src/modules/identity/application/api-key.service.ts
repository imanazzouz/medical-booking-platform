import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { issueApiKey, type ApiKeyScope } from "@/lib/security/api-key";
import type { ApiKeyRepository } from "@/modules/identity/application/api-key.ports";

const MAX_KEY_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export class ApiKeyService {
  constructor(private readonly repository: ApiKeyRepository, private readonly now: () => Date = () => new Date()) {}

  async create(input: { userId: string; name: string; scopes: ApiKeyScope[]; expiresInDays: number; authSource: "cookie" | "bearer" | "api-key" }) {
    if (input.authSource === "api-key") throw new ForbiddenError("لا يمكن لمفتاح API إنشاء مفاتيح أخرى");
    const name = input.name.trim();
    if (!name || name.length > 100 || input.scopes.length < 1 || input.scopes.length > 10 || new Set(input.scopes).size !== input.scopes.length) {
      throw new ValidationError({ apiKey: ["اسم المفتاح والنطاقات غير صالحة"] });
    }
    if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 365) throw new ValidationError({ expiresInDays: ["صلاحية المفتاح يجب أن تكون من يوم إلى 365 يوماً"] });
    const issued = issueApiKey();
    const expiresAt = new Date(this.now().getTime() + Math.min(input.expiresInDays * 86_400_000, MAX_KEY_AGE_MS));
    try {
      const key = await this.repository.create({ ownerUserId: input.userId, createdByUserId: input.userId, name, prefix: issued.prefix, keyHash: issued.keyHash, scopes: input.scopes, expiresAt });
      return { key, token: issued.token };
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) throw new ConflictError("تعذر إنشاء المفتاح؛ أعد المحاولة");
      throw error;
    }
  }

  async list(userId: string, authSource: "cookie" | "bearer" | "api-key") {
    if (authSource === "api-key") throw new ForbiddenError("إدارة مفاتيح API تتطلب جلسة مستخدم مباشرة");
    return { items: await this.repository.list(userId) };
  }

  async revoke(userId: string, keyId: string, authSource: "cookie" | "bearer" | "api-key") {
    if (authSource === "api-key") throw new ForbiddenError("إدارة مفاتيح API تتطلب جلسة مستخدم مباشرة");
    if (!await this.repository.revoke(userId, keyId, this.now())) throw new NotFoundError("مفتاح API غير موجود أو مبطل");
    return { id: keyId, revoked: true };
  }
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}
