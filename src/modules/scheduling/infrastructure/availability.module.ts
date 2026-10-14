import { AvailabilityService } from "@/modules/scheduling/application/availability.service";
import { AvailabilityManagementService } from "@/modules/scheduling/application/availability-management.service";
import { AvailabilityMaintenanceService } from "@/modules/scheduling/application/availability-maintenance.service";
import { PrismaAvailabilityRepository } from "@/modules/scheduling/infrastructure/prisma-availability.repository";
import { PrismaAvailabilityManagementRepository } from "@/modules/scheduling/infrastructure/prisma-availability-management.repository";

export const availabilityService = new AvailabilityService(new PrismaAvailabilityRepository());
const availabilityRepository = new PrismaAvailabilityManagementRepository();
export const availabilityManagementService = new AvailabilityManagementService(availabilityRepository);
export const availabilityMaintenanceService = new AvailabilityMaintenanceService(availabilityRepository);
