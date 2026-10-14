import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/http/errors";
import { constantTimeDigestEqual, hashApiKey, issueApiKey } from "@/lib/security/api-key";
import { ApiKeyService } from "@/modules/identity/application/api-key.service";
import type { ApiKeyRepository } from "@/modules/identity/application/api-key.ports";

describe("API key lifecycle", () => {
  it("returns a high-entropy secret once and stores only its keyed digest", () => {
    const issued = issueApiKey();
    expect(issued.token).toMatch(/^mbk_live_[a-f0-9]{12}_[A-Za-z0-9_-]{43}$/);
    expect(issued.keyHash).toBe(hashApiKey(issued.token));
    expect(issued.keyHash).not.toContain(issued.token);
    expect(constantTimeDigestEqual(issued.keyHash, hashApiKey(issued.token))).toBe(true);
    expect(constantTimeDigestEqual(issued.keyHash, "not-a-digest")).toBe(false);
  });

  it("limits key lifetime and never permits an API key to manage keys", async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: "key-1", name: "integration", scopes: ["directory:read"] }), list: vi.fn(), revoke: vi.fn() } as unknown as ApiKeyRepository;
    const now = new Date("2026-10-11T12:00:00.000Z");
    const service = new ApiKeyService(repository, () => now);
    const result = await service.create({ userId: "user-1", name: " integration ", scopes: ["directory:read"], expiresInDays: 30, authSource: "cookie" });
    expect(result.token).toMatch(/^mbk_live_/);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: "user-1", createdByUserId: "user-1", name: "integration", expiresAt: new Date(now.getTime() + 30 * 86_400_000) }));
    await expect(service.create({ userId: "user-1", name: "nested", scopes: ["directory:read"], expiresInDays: 30, authSource: "api-key" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.list("user-1", "api-key")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.revoke("user-1", "key-1", "api-key")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects duplicate scopes and invalid expiry values", async () => {
    const repository = { create: vi.fn(), list: vi.fn(), revoke: vi.fn() } as unknown as ApiKeyRepository;
    const service = new ApiKeyService(repository);
    await expect(service.create({ userId: "u1", name: "x", scopes: ["directory:read", "directory:read"], expiresInDays: 7, authSource: "cookie" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create({ userId: "u1", name: "x", scopes: ["directory:read"], expiresInDays: 366, authSource: "cookie" })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
