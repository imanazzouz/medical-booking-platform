import type { OrganizationType } from "@prisma/client";
import type { OrganizationCreateDto, SearchDto } from "@/modules/directory/application/directory.dto";

export interface DirectoryRepository {
  searchProviders(input: SearchDto): Promise<{ items: unknown[]; total: number }>;
  getOrganization(id: string): Promise<unknown | null>;
  createOrganization(input: OrganizationCreateDto): Promise<unknown>;
  updateOrganization(id: string, data: Record<string, unknown>): Promise<unknown>;
  softDeleteOrganization(id: string, at: Date): Promise<boolean>;
  canManageOrganization(userId: string, organizationId: string): Promise<boolean>;
  listDoctors(input: { specialty?: string; page: number; pageSize: number }): Promise<{ items: unknown[]; total: number }>;
  getDoctor(id: string): Promise<unknown | null>;
  createDoctor(input: { userId: string; publicSlug: string; publicBiography?: string; yearsOfExperience?: number; license: { ciphertext: Buffer; nonce: Buffer; authTag: Buffer; lookupHash: string; keyVersion: string } }): Promise<unknown>;
  updateDoctor(id: string, data: Record<string, unknown>): Promise<unknown>;
  softDeleteDoctor(id: string, at: Date): Promise<boolean>;
  doctorIdForUser(userId: string): Promise<string | null>;
  organizationTypeForCreate(type: string): OrganizationType;
}
