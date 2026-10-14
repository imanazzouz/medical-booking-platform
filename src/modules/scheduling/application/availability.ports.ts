export interface PublicSlot { id: string; startsAt: Date; endsAt: Date; capacity: number; bookedCount: number; location: unknown; doctor: unknown }
export interface AvailabilityRepository {
  serviceIsPubliclyBookable(serviceId: string): Promise<boolean>;
  findSlots(input: { serviceId: string; from: Date; to: Date; doctorId?: string; locationId?: string }): Promise<PublicSlot[]>;
}
