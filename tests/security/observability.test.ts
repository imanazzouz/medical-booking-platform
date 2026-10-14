import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "@/lib/observability/sentry-scrubber";

describe("observability privacy filters", () => {
  it("removes request and identity fields while retaining a redacted exception type", () => {
    const event = scrubSentryEvent({
      event_id: "event-1",
      message: "patient@example.test booked a cardiology visit",
      request: { url: "https://tibbi.example/api/v1/bookings?patientId=secret", method: "POST", data: { diagnosis: "private" }, headers: { authorization: "Bearer secret" } },
      user: { id: "user-1", email: "patient@example.test" },
      breadcrumbs: [{ timestamp: 1, message: "patient opened record" }],
      tags: { patientId: "patient-1" },
      extra: { medicalRecord: "sensitive" },
      exception: { values: [{
        type: "patient@example.test",
        value: "patient@example.test failed booking",
        mechanism: { type: "generic", handled: false, data: { diagnosis: "sensitive" } },
        stacktrace: { frames: [{ filename: "https://tibbi.example/_next/app.js?patient=secret", lineno: 8, colno: 4, vars: { diagnosis: "private" }, pre_context: ["patient context"] }] },
      }] },
    });

    expect(event.event_id).toBe("event-1");
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toEqual([]);
    expect(event.tags).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.exception?.values?.[0].value).toBe("[redacted]");
    expect(event.exception?.values?.[0].type).toBe("CustomError");
    expect(event.exception?.values?.[0].mechanism).toEqual({ type: "generic", handled: false, synthetic: undefined });
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({
      filename: "https://tibbi.example/_next/app.js",
      abs_path: undefined,
      function: undefined,
      module: undefined,
      lineno: 8,
      colno: 4,
      in_app: undefined,
      platform: undefined,
    });
  });
});
