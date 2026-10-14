import { describe, expect, it } from "vitest";
import { getClinicDayRange } from "@/features/directory/api";

describe("getClinicDayRange", () => {
  it("converts clinic-local calendar boundaries to UTC for Algeria", () => {
    const range = getClinicDayRange(new Date(2026, 9, 12, 12), "Africa/Algiers");
    expect(range.from.toISOString()).toBe("2026-10-11T23:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-12T23:00:00.000Z");
  });

  it("uses a 23-hour local day across the spring DST transition", () => {
    const range = getClinicDayRange(new Date(2026, 2, 8, 12), "America/New_York");
    expect(range.from.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(range.to.getTime() - range.from.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("uses a 25-hour local day across the autumn DST transition", () => {
    const range = getClinicDayRange(new Date(2026, 10, 1, 12), "America/New_York");
    expect(range.from.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(range.to.getTime() - range.from.getTime()).toBe(25 * 60 * 60 * 1000);
  });
});
