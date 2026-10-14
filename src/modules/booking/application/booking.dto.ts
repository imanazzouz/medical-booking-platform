import { z } from "zod";
import type { AppointmentStatus, OrganizationType, Prisma, ServiceType } from "@prisma/client";
export const createBookingSchema = z.object({ slotId: z.string().uuid() });
export const bookingIdSchema = z.string().uuid();

/** Allowlisted response shape: encrypted notes, patient identifiers, and provider credentials are never serialized. */
export interface AppointmentResponseDto {
  id: string;
  bookingReference: string;
  status: AppointmentStatus;
  createdAt: Date;
  holdExpiresAt?: Date | null;
  slot: {
    startsAt: Date;
    endsAt: Date;
    location: { id: string; name: string; addressLine: string; city: string; timezone: string } | null;
    doctor: { id: string; publicSlug: string; user: { name: string | null } } | null;
    service: {
      id: string;
      type: ServiceType;
      price: Prisma.Decimal;
      currency: string;
      durationMinutes: number;
      translations: Array<{ locale: string; name: string }>;
      organization: { id: string; slug: string; type: OrganizationType; translations: Array<{ locale: string; name: string }> };
    };
  };
  statusHistory?: Array<{ fromStatus: AppointmentStatus | null; toStatus: AppointmentStatus; reason: string; createdAt: Date }>;
  payments?: Array<{ id: string; status: string; amount: Prisma.Decimal; currency: string; paidAt: Date | null; createdAt: Date }>;
}
export interface AppointmentPageResponseDto { items: AppointmentResponseDto[]; total: number }
