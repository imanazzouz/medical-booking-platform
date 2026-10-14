import type { AppointmentResponseDto } from "@/modules/booking/application/booking.dto";
export interface BookingRepository {
  patientIdForUser(userId: string): Promise<string | null>;
  getByIdempotencyHash(hash: string): Promise<{ id: string; requestHash: string | null; patientId: string } | null>;
  createBooking(input: { patientId: string; slotId: string; bookingReference: string; idempotencyKeyHash: string; requestHash: string; now: Date }): Promise<AppointmentResponseDto>;
  cancelBooking(input: { appointmentId: string; patientId: string; now: Date }): Promise<AppointmentResponseDto>;
  getMutationIdempotency(userId: string, keyHash: string, now: Date): Promise<{ requestHash: string; appointmentId: string } | null>;
  rescheduleBooking(input: { userId: string; appointmentId: string; patientId: string; slotId: string; keyHash: string; requestHash: string; now: Date }): Promise<AppointmentResponseDto>;
  decideBooking(input: { appointmentId: string; actorUserId: string; decision: "APPROVE" | "REJECT"; now: Date }): Promise<AppointmentResponseDto>;
  listForProvider(userId: string, page: number, pageSize: number): Promise<{ items: AppointmentResponseDto[]; total: number }>;
  listForPatient(patientId: string, page: number, pageSize: number): Promise<{ items: AppointmentResponseDto[]; total: number }>;
  getForPatient(appointmentId: string, patientId: string): Promise<AppointmentResponseDto | null>;
}
