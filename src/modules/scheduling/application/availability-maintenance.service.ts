import type { AvailabilityManagementRepository } from "@/modules/scheduling/application/availability-management.ports";

const HORIZON_DAYS = 90;

/** Keeps materialized availability rolling forward; bookings still revalidate inside their transaction. */
export class AvailabilityMaintenanceService {
  constructor(
    private readonly repository: AvailabilityManagementRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  run() {
    const now = this.now();
    const horizonEnd = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
    return this.repository.generateHorizon(now, horizonEnd, now);
  }
}
