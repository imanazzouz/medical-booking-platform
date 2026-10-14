import { describe, expect, it, vi } from "vitest";
import { DirectoryService } from "@/modules/directory/application/directory.service";
import type { DirectoryRepository } from "@/modules/directory/application/directory.ports";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { ForbiddenError } from "@/lib/http/errors";

describe("DirectoryService", () => {
  it("rejects organization creation for non-admins", async () => {
    const repository = { createOrganization: vi.fn() } as unknown as DirectoryRepository;
    const service = new DirectoryService(repository, {} as FieldEncryptionService);
    await expect(service.createOrganization({ type: "CLINIC", slug: "clinic-one", name: "Clinic", locale: "ar" }, { id: "u1", roles: ["USER"], authSource: "bearer" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.createOrganization).not.toHaveBeenCalled();
  });

  it("allows an active organization owner to update the organization", async () => {
    const repository = { canManageOrganization: vi.fn().mockResolvedValue(true), updateOrganization: vi.fn().mockResolvedValue({ id: "org-1" }) } as unknown as DirectoryRepository;
    const service = new DirectoryService(repository, {} as FieldEncryptionService);
    await expect(service.updateOrganization("org-1", { name: "New name", locale: "ar" }, { id: "u1", roles: ["USER"], authSource: "bearer" })).resolves.toEqual({ id: "org-1" });
    expect(repository.updateOrganization).toHaveBeenCalledOnce();
  });
});
