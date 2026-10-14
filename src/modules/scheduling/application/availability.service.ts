import { z } from "zod";
import { ValidationError } from "@/lib/http/errors";
import type { AvailabilityRepository } from "@/modules/scheduling/application/availability.ports";

const querySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  doctorId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository, private readonly now: () => Date = () => new Date()) {}

  async list(serviceId: string, raw: unknown) {
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const from = new Date(parsed.data.from);
    const to = new Date(parsed.data.to);
    if (to <= from || to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) throw new ValidationError({ dateRange: ["يجب أن تكون الفترة حتى 31 يوماً"] });
    if (from.getTime() < this.now().getTime() - 60_000) throw new ValidationError({ from: ["لا يمكن طلب فترات ماضية"] });
    if (!await this.repository.serviceIsPubliclyBookable(serviceId)) return { slots: [] };
    const slots = await this.repository.findSlots({ serviceId, from, to, doctorId: parsed.data.doctorId, locationId: parsed.data.locationId });
    return { slots: slots.filter((slot) => slot.capacity > slot.bookedCount) };
  }
}
