import { describe, expect, it } from "vitest";
import { canStartLogRocket, LOGROCKET_ENTRY_ROUTES, sanitizeLogRocketUrl } from "@/lib/observability/logrocket-policy";

describe("LogRocket privacy policy", () => {
  it("requires BAA approval, an app id, explicit consent, and a public entry route", () => {
    const base = { approved: true, appId: "org/app", consent: "granted" as const, pathname: "/" };
    expect(canStartLogRocket(base)).toBe(true);
    expect(canStartLogRocket({ ...base, approved: false })).toBe(false);
    expect(canStartLogRocket({ ...base, appId: " " })).toBe(false);
    expect(canStartLogRocket({ ...base, consent: "unknown" })).toBe(false);
    expect(canStartLogRocket({ ...base, consent: "denied" })).toBe(false);
    expect(canStartLogRocket({ ...base, pathname: "/dashboard/patient" })).toBe(false);
  });

  it("keeps only the approved public route names and removes query and fragments", () => {
    for (const route of LOGROCKET_ENTRY_ROUTES) {
      expect(sanitizeLogRocketUrl(`https://tibbi.example${route}?patient=secret#token`, "https://tibbi.example"))
        .toBe(`https://tibbi.example${route === "/" ? "/" : route}`);
    }
    expect(sanitizeLogRocketUrl("/dashboard/patient?id=secret", "https://tibbi.example"))
      .toBe("https://tibbi.example/[restricted]");
  });

  it("rejects off-origin URLs so they cannot reveal external identity providers", () => {
    expect(sanitizeLogRocketUrl("https://identity.example/login?email=secret", "https://tibbi.example")).toBeNull();
    expect(sanitizeLogRocketUrl("http://[", "https://tibbi.example")).toBeNull();
  });
});
