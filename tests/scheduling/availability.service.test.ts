import { describe, expect, it, vi } from "vitest";
import { AvailabilityService } from "@/modules/scheduling/application/availability.service";
import type { AvailabilityRepository } from "@/modules/scheduling/application/availability.ports";
import { ValidationError } from "@/lib/http/errors";

describe("AvailabilityService", () => {
  it("validates the range and returns only slots with capacity", async () => {
    const now = new Date("2030-01-01T00:00:00.000Z");
    const repository = {
      serviceIsPubliclyBookable: vi.fn().mockResolvedValue(true),
      findSlots: vi.fn().mockResolvedValue([
        { id: "open", capacity: 2, bookedCount: 1 },
        { id: "full", capacity: 1, bookedCount: 1 },
      ]),
    } as unknown as AvailabilityRepository;
    const service = new AvailabilityService(repository, () => now);
    const result = await service.list("service-id", { from: "2030-01-02T00:00:00Z", to: "2030-01-03T00:00:00Z" });
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].id).toBe("open");
  });

  it("rejects requests longer than 31 days", async () => {
    const repository = { serviceIsPubliclyBookable: vi.fn(), findSlots: vi.fn() } as unknown as AvailabilityRepository;
    const service = new AvailabilityService(repository, () => new Date("2030-01-01T00:00:00Z"));
    await expect(service.list("service-id", { from: "2030-01-02T00:00:00Z", to: "2030-03-01T00:00:00Z" })).rejects.toBeInstanceOf(ValidationError);
  });
});
