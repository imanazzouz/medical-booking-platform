import { prisma } from "@/lib/db/prisma";
import type { AvailabilityRepository, PublicSlot } from "@/modules/scheduling/application/availability.ports";

export class PrismaAvailabilityRepository implements AvailabilityRepository {
  async serviceIsPubliclyBookable(serviceId: string): Promise<boolean> {
    const row = await prisma.service.findFirst({ where: { id: serviceId, isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } }, select: { id: true } });
    return Boolean(row);
  }
  findSlots(input: { serviceId: string; from: Date; to: Date; doctorId?: string; locationId?: string }): Promise<PublicSlot[]> {
    return prisma.appointmentSlot.findMany({
      where: { serviceId: input.serviceId, startsAt: { gte: input.from, lt: input.to }, status: "AVAILABLE", deletedAt: null,
        service: { isActive: true, deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } },
        AND: [{ OR: [{ doctorId: null, service: { requiresDoctor: false } }, { doctor: { is: { deletedAt: null, verificationStatus: "VERIFIED", serviceAssignments: { some: { serviceId: input.serviceId, deletedAt: null } } } } }] }],
        ...(input.doctorId ? { doctorId: input.doctorId } : {}), ...(input.locationId ? { locationId: input.locationId, location: { is: { deletedAt: null } } } : {}) },
      orderBy: { startsAt: "asc" }, take: 500,
      select: { id: true, startsAt: true, endsAt: true, capacity: true, bookedCount: true, location: { select: { id: true, name: true, timezone: true } }, doctor: { select: { id: true, publicSlug: true, user: { select: { name: true } } } } },
    });
  }
}
