import { prisma } from "@/lib/db/prisma";
import type { ApiKeyRepository } from "@/modules/identity/application/api-key.ports";
import type { ApiKeyScope } from "@/lib/security/api-key";

const apiKeyView = { id: true, name: true, prefix: true, scopes: true, expiresAt: true, lastUsedAt: true, revokedAt: true, createdAt: true } as const;

export class PrismaApiKeyRepository implements ApiKeyRepository {
  async create(input: { ownerUserId: string; createdByUserId: string; name: string; prefix: string; keyHash: string; scopes: ApiKeyScope[]; expiresAt: Date }) {
    return prisma.$transaction(async (tx) => {
      const key = await tx.apiKey.create({ data: input, select: apiKeyView });
      await tx.auditLog.create({ data: {
        actorUserId: input.createdByUserId, action: "API_KEY_CREATED", resourceType: "API_KEY", resourceId: key.id,
        metadata: { prefix: input.prefix, scopes: input.scopes, expiresAt: input.expiresAt.toISOString() },
      } });
      return key;
    });
  }

  list(ownerUserId: string) {
    return prisma.apiKey.findMany({ where: { ownerUserId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100, select: apiKeyView });
  }

  async revoke(ownerUserId: string, keyId: string, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.apiKey.updateMany({ where: { id: keyId, ownerUserId, revokedAt: null, deletedAt: null }, data: { revokedAt: now } });
      if (result.count !== 1) return false;
      await tx.auditLog.create({ data: { actorUserId: ownerUserId, action: "API_KEY_REVOKED", resourceType: "API_KEY", resourceId: keyId } });
      return true;
    });
  }
}
