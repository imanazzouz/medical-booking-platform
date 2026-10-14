import type { ApiKeyScope } from "@/lib/security/api-key";

export interface ApiKeyRecord {
  id: string; name: string; prefix: string; scopes: string[]; expiresAt: Date | null;
  lastUsedAt: Date | null; revokedAt: Date | null; createdAt: Date;
}
export interface ApiKeyRepository {
  create(input: { ownerUserId: string; createdByUserId: string; name: string; prefix: string; keyHash: string; scopes: ApiKeyScope[]; expiresAt: Date }): Promise<ApiKeyRecord>;
  list(ownerUserId: string): Promise<ApiKeyRecord[]>;
  revoke(ownerUserId: string, keyId: string, now: Date): Promise<boolean>;
}
