import { describe, expect, it, vi } from "vitest";
import { AvailabilityMaintenanceService } from "@/modules/scheduling/application/availability-maintenance.service";
import type { AvailabilityManagementRepository } from "@/modules/scheduling/application/availability-management.ports";

describe("AvailabilityMaintenanceService", () => {
  it("asks the repository to materialize the next 90 days from the injected clock", async () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    const repository = { generateHorizon: vi.fn().mockResolvedValue({ services: 3, created: 40, reactivated: 2, skippedConflicts: 0, failures: [] }) } as unknown as AvailabilityManagementRepository;
    const service = new AvailabilityMaintenanceService(repository, () => now);
    const result = await service.run();
    expect(repository.generateHorizon).toHaveBeenCalledWith(now, new Date(now.getTime() + 90 * 86_400_000), now);
    expect(result.services).toBe(3);
  });
});
