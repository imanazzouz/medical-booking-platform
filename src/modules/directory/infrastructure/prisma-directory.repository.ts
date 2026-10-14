import { OrganizationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { DirectoryRepository } from "@/modules/directory/application/directory.ports";
import type { OrganizationCreateDto, SearchDto } from "@/modules/directory/application/directory.dto";

export class PrismaDirectoryRepository implements DirectoryRepository {
  async searchProviders(input: SearchDto): Promise<{ items: unknown[]; total: number }> {
    const serviceFilters: Prisma.ServiceWhereInput[] = [{ isActive: true, deletedAt: null }];
    if (input.minPrice !== undefined || input.maxPrice !== undefined) serviceFilters.push({ price: { gte: input.minPrice, lte: input.maxPrice } });
    if (input.specialty) serviceFilters.push({ doctorAssignments: { some: { deletedAt: null, doctor: { deletedAt: null, verificationStatus: "VERIFIED", specialties: { some: { deletedAt: null, specialty: { code: input.specialty, isActive: true } } } } } } });
    if (input.date) {
      // Product currently launches in Algeria; interpret requested calendar date in Africa/Algiers.
      const start = new Date(`${input.date}T00:00:00+01:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      serviceFilters.push({ slots: { some: { startsAt: { gte: start, lt: end }, bookedCount: { lt: 1 }, status: "AVAILABLE", deletedAt: null } } });
    }
    const where: Prisma.OrganizationWhereInput = {
      status: "ACTIVE", deletedAt: null,
      ...(input.type ? { type: input.type } : {}),
      ...(input.city ? { locations: { some: { city: { contains: input.city, mode: "insensitive" }, deletedAt: null } } } : {}),
      services: { some: { AND: serviceFilters } },
    };
    const [items, total] = await prisma.$transaction([
      prisma.organization.findMany({
        where, skip: (input.page - 1) * input.pageSize, take: input.pageSize,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          id: true, type: true, slug: true, publicEmail: true, publicWebsite: true,
          translations: { where: { locale: input.locale, deletedAt: null }, select: { locale: true, name: true, description: true }, take: 1 },
          locations: { where: { deletedAt: null }, select: { id: true, name: true, city: true, addressLine: true, timezone: true }, take: 10 },
          services: { where: { isActive: true, deletedAt: null }, select: { id: true, type: true, price: true, currency: true, durationMinutes: true, translations: { where: { locale: input.locale, deletedAt: null }, select: { name: true }, take: 1 } }, take: 20 },
        },
      }),
      prisma.organization.count({ where }),
    ]);
    return { items, total };
  }

  getOrganization(id: string): Promise<unknown | null> {
    return prisma.organization.findFirst({ where: { id, status: "ACTIVE", deletedAt: null }, select: {
      id: true, type: true, slug: true, publicEmail: true, publicWebsite: true,
      translations: { where: { deletedAt: null }, select: { locale: true, name: true, description: true } },
      locations: { where: { deletedAt: null }, select: { id: true, name: true, addressLine: true, city: true, region: true, countryCode: true, timezone: true, latitude: true, longitude: true } },
      services: { where: { isActive: true, deletedAt: null }, select: { id: true, type: true, durationMinutes: true, price: true, currency: true, requiresDoctor: true, translations: { where: { deletedAt: null }, select: { locale: true, name: true, description: true, preparationNotes: true } } } },
    } });
  }

  async createOrganization(input: OrganizationCreateDto): Promise<unknown> {
    return prisma.organization.create({
      data: {
        type: input.type, slug: input.slug, publicEmail: input.publicEmail, publicWebsite: input.publicWebsite,
        description: input.description, status: "PENDING_REVIEW",
        translations: { create: { locale: input.locale, name: input.name, description: input.description } },
        members: input.ownerUserId ? { create: { userId: input.ownerUserId, role: "OWNER", status: "ACTIVE" } } : undefined,
        clinicProfile: input.type === "CLINIC" ? { create: {} } : undefined,
        radiologyProfile: input.type === "RADIOLOGY_CENTER" ? { create: {} } : undefined,
        labProfile: input.type === "LAB_CENTER" ? { create: {} } : undefined,
      },
      select: { id: true, type: true, slug: true, status: true, createdAt: true },
    });
  }

  async updateOrganization(id: string, data: Record<string, unknown>): Promise<unknown> {
    const { name, locale, ...fields } = data as { name?: string; locale?: "ar" | "en"; [key: string]: unknown };
    return prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({ where: { id, deletedAt: null }, data: fields as Prisma.OrganizationUpdateInput, select: { id: true, type: true, slug: true, status: true, updatedAt: true } });
      if (name && locale) {
        await tx.organizationTranslation.upsert({
          where: { organizationId_locale: { organizationId: id, locale } },
          create: { organizationId: id, locale, name, description: typeof fields.description === "string" ? fields.description : undefined },
          update: { name, ...(typeof fields.description === "string" ? { description: fields.description } : {}) },
        });
      }
      return updated;
    });
  }

  async softDeleteOrganization(id: string, at: Date): Promise<boolean> {
    const result = await prisma.organization.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: at, status: "SUSPENDED" } });
    return result.count === 1;
  }
  async canManageOrganization(userId: string, organizationId: string): Promise<boolean> {
    const membership = await prisma.organizationMember.findFirst({ where: { userId, organizationId, status: "ACTIVE", deletedAt: null, role: { in: ["OWNER", "ADMIN"] }, organization: { deletedAt: null } }, select: { id: true } });
    return Boolean(membership);
  }

  async listDoctors(input: { specialty?: string; page: number; pageSize: number }): Promise<{ items: unknown[]; total: number }> {
    const where: Prisma.DoctorProfileWhereInput = {
      verificationStatus: "VERIFIED", deletedAt: null,
      ...(input.specialty ? { specialties: { some: { deletedAt: null, specialty: { code: input.specialty, isActive: true } } } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.doctorProfile.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { publicSlug: "asc" }, select: {
        id: true, publicSlug: true, publicBiography: true, yearsOfExperience: true,
        user: { select: { name: true } }, specialties: { where: { deletedAt: null }, select: { isPrimary: true, specialty: { select: { code: true, nameAr: true, nameEn: true } } } },
        serviceAssignments: { where: { deletedAt: null, service: { isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } } }, select: { service: { select: { id: true, type: true, price: true, currency: true, bookingMode: true, translations: { where: { deletedAt: null }, select: { locale: true, name: true }, take: 2 }, locations: { where: { deletedAt: null, location: { deletedAt: null } }, select: { location: { select: { id: true, name: true, city: true, timezone: true } } }, take: 10 } } } }, take: 10 },
      } }),
      prisma.doctorProfile.count({ where }),
    ]);
    return { items, total };
  }

  getDoctor(identifier: string): Promise<unknown | null> {
    const where = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
      ? { OR: [{ id: identifier }, { publicSlug: identifier }] }
      : { publicSlug: identifier };
    return prisma.doctorProfile.findFirst({ where: { ...where, deletedAt: null, verificationStatus: "VERIFIED" }, select: {
      id: true, publicSlug: true, publicBiography: true, yearsOfExperience: true,
      user: { select: { name: true } }, specialties: { where: { deletedAt: null }, select: { isPrimary: true, specialty: { select: { code: true, nameAr: true, nameEn: true } } } },
      serviceAssignments: { where: { deletedAt: null, service: { isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } } }, select: { service: { select: { id: true, type: true, price: true, currency: true, durationMinutes: true, bookingMode: true, translations: { where: { deletedAt: null }, select: { locale: true, name: true }, take: 2 }, locations: { where: { deletedAt: null, location: { deletedAt: null } }, select: { location: { select: { id: true, name: true, city: true, timezone: true } } }, take: 10 }, organization: { select: { id: true, slug: true, type: true, translations: { where: { deletedAt: null }, select: { locale: true, name: true }, take: 2 } } } } } } },
    } });
  }

  createDoctor(input: { userId: string; publicSlug: string; publicBiography?: string; yearsOfExperience?: number; license: { ciphertext: Buffer; nonce: Buffer; authTag: Buffer; lookupHash: string; keyVersion: string } }): Promise<unknown> {
    return prisma.doctorProfile.create({ data: {
      userId: input.userId, publicSlug: input.publicSlug, publicBiography: input.publicBiography, yearsOfExperience: input.yearsOfExperience,
      licenseNumberCiphertext: new Uint8Array(input.license.ciphertext), licenseNumberNonce: new Uint8Array(input.license.nonce), licenseNumberAuthTag: new Uint8Array(input.license.authTag),
      licenseLookupHash: input.license.lookupHash, encryptionKeyVersion: input.license.keyVersion,
    }, select: { id: true, userId: true, publicSlug: true, verificationStatus: true, createdAt: true } });
  }
  updateDoctor(id: string, data: Record<string, unknown>): Promise<unknown> {
    return prisma.doctorProfile.update({ where: { id, deletedAt: null }, data: data as Prisma.DoctorProfileUpdateInput, select: { id: true, publicSlug: true, publicBiography: true, yearsOfExperience: true, verificationStatus: true, updatedAt: true } });
  }
  async softDeleteDoctor(id: string, at: Date): Promise<boolean> {
    const result = await prisma.doctorProfile.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: at } });
    return result.count === 1;
  }
  async doctorIdForUser(userId: string): Promise<string | null> {
    const doctor = await prisma.doctorProfile.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    return doctor?.id ?? null;
  }
  organizationTypeForCreate(type: string): OrganizationType { return type as OrganizationType; }
}
