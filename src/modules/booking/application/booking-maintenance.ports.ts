export interface BookingMaintenanceRepository {
  expirePendingApprovals(now: Date, limit: number): Promise<number>;
  expireWaitlistOffers(now: Date, limit: number): Promise<number>;
}
