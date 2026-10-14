import { z } from "zod";

export const organizationCreateSchema = z.object({
  type: z.enum(["CLINIC", "RADIOLOGY_CENTER", "LAB_CENTER"]),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["ar", "en"]).default("ar"),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  publicEmail: z.string().email().max(320).optional(),
  publicWebsite: z.string().url().max(2048).optional(),
  ownerUserId: z.string().uuid().optional(),
});
export const organizationUpdateSchema = organizationCreateSchema.partial().omit({ type: true, ownerUserId: true }).extend({ status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED"]).optional() });
export const doctorCreateSchema = z.object({
  userId: z.string().uuid(),
  publicSlug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publicBiography: z.string().trim().max(5000).optional(),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
  licenseNumber: z.string().trim().min(3).max(100),
});
export const doctorUpdateSchema = z.object({
  publicSlug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  publicBiography: z.string().trim().max(5000).optional(),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "EXPIRED"]).optional(),
});
export const searchSchema = z.object({
  type: z.enum(["CLINIC", "RADIOLOGY_CENTER", "LAB_CENTER"]).optional(),
  specialty: z.string().trim().max(80).optional(),
  city: z.string().trim().max(120).optional(),
  date: z.string().date().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  locale: z.enum(["ar", "en"]).default("ar"),
}).refine((x) => x.minPrice === undefined || x.maxPrice === undefined || x.minPrice <= x.maxPrice, { path: ["maxPrice"], message: "يجب ألا يقل الحد الأعلى عن الحد الأدنى" });
export type OrganizationCreateDto = z.infer<typeof organizationCreateSchema>;
export type SearchDto = z.infer<typeof searchSchema>;
