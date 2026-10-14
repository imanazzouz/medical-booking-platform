import { BookingService } from "@/modules/booking/application/booking.service";
import { PrismaBookingRepository } from "@/modules/booking/infrastructure/prisma-booking.repository";
import { WaitlistService } from "@/modules/booking/application/waitlist.service";
import { PrismaWaitlistRepository } from "@/modules/booking/infrastructure/prisma-waitlist.repository";
export const bookingService = new BookingService(new PrismaBookingRepository());
export const waitlistService = new WaitlistService(new PrismaWaitlistRepository());
