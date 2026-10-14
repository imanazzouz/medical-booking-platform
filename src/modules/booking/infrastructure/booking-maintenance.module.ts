import { BookingMaintenanceService } from "@/modules/booking/application/booking-maintenance.service";
import { PrismaBookingMaintenanceRepository } from "@/modules/booking/infrastructure/prisma-booking-maintenance.repository";
export const bookingMaintenanceService = new BookingMaintenanceService(new PrismaBookingMaintenanceRepository());
