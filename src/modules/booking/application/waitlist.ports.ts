import type { AppointmentResponseDto } from "@/modules/booking/application/booking.dto";

export interface WaitlistInput { serviceId: string; doctorId: string | null; locationId: string | null; earliestAt: Date; latestAt: Date }
export interface WaitlistRepository {
  patientIdForUser(userId: string): Promise<string | null>;
  create(userId: string, patientId: string, input: WaitlistInput, now: Date): Promise<unknown>;
  list(patientId: string): Promise<unknown[]>;
  cancel(patientId: string, entryId: string, now: Date): Promise<boolean>;
  accept(patientId: string, entryId: string, bookingReference: string, now: Date): Promise<AppointmentResponseDto>;
}
