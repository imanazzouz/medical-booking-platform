import { describe, expect, it } from "vitest";
import { generateSlots, type GenerationRule } from "@/modules/scheduling/application/slot-generator";

function time(value: string): Date {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hour, minute));
}
function rule(overrides: Partial<GenerationRule> = {}): GenerationRule {
  return {
    id: "rule-1", weekday: 1, startTime: time("09:00"), endTime: time("11:00"), timezone: "Africa/Algiers",
    validFrom: null, validUntil: null, doctorId: "doctor-1", locationId: "location-1", exceptions: [], ...overrides,
  };
}
const range = { from: new Date("2026-10-12T00:00:00Z"), to: new Date("2026-10-13T00:00:00Z"), now: new Date("2026-10-11T00:00:00Z") };

describe("generateSlots", () => {
  it("expands weekly local hours by the service duration into UTC slots", () => {
    const slots = generateSlots({ serviceId: "service-1", durationMinutes: 30, ...range, rules: [rule()] });
    expect(slots).toHaveLength(4);
    expect(slots[0].startsAt.toISOString()).toBe("2026-10-12T08:00:00.000Z");
    expect(slots[0].endsAt.toISOString()).toBe("2026-10-12T08:30:00.000Z");
    expect(slots.every((slot) => slot.resourceKey === "doctor:doctor-1")).toBe(true);
  });

  it("applies a partial emergency closure to every overlapping slot", () => {
    const slots = generateSlots({ serviceId: "service-1", durationMinutes: 30, ...range, rules: [rule({ exceptions: [{ date: new Date("2026-10-12T00:00:00Z"), type: "CLOSED", startTime: time("09:45"), endTime: time("10:15") }] })] });
    expect(slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      "2026-10-12T08:00:00.000Z", "2026-10-12T09:30:00.000Z",
    ]);
  });

  it("adds explicit open-extra hours on an otherwise closed weekday", () => {
    const slots = generateSlots({ serviceId: "service-1", durationMinutes: 30, ...range, rules: [rule({ weekday: 2, exceptions: [{ date: new Date("2026-10-12T00:00:00Z"), type: "OPEN_EXTRA", startTime: time("13:00"), endTime: time("14:00") }] })] });
    expect(slots).toHaveLength(2);
    expect(slots[0].startsAt.toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });

  it("discards wall-clock windows inside a daylight-saving gap instead of shifting them", () => {
    const slots = generateSlots({
      serviceId: "service-1", durationMinutes: 30, from: new Date("2026-03-08T00:00:00Z"), to: new Date("2026-03-09T00:00:00Z"), now: new Date("2026-03-07T00:00:00Z"),
      rules: [rule({ weekday: 7, timezone: "America/New_York", startTime: time("02:30"), endTime: time("04:00") })],
    });
    expect(slots).toHaveLength(0);
  });

  it("rejects invalid duration", () => {
    expect(() => generateSlots({ serviceId: "service-1", durationMinutes: 0, ...range, rules: [rule()] })).toThrow("INVALID_SERVICE_DURATION");
  });
});
