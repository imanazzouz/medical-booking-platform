import type { BookingMaintenanceRepository } from "@/modules/booking/application/booking-maintenance.ports";

export class BookingMaintenanceService {
  constructor(private readonly repository: BookingMaintenanceRepository, private readonly now: () => Date = () => new Date()) {}
  async runBatch(limit = 50) {
    const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
    const now = this.now();
    const pendingApprovals = await this.repository.expirePendingApprovals(now, bounded);
    const waitlistOffers = await this.repository.expireWaitlistOffers(now, bounded);
    return { pendingApprovals, waitlistOffers };
  }
}
