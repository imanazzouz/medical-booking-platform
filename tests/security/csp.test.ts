import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

function withEnvironment(name: string, value: string | undefined, run: () => void): void {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

describe("Content Security Policy", () => {
  it("uses a per-request nonce and production-safe directives", () => {
    withEnvironment("MEDIA_CDN_ORIGIN", undefined, () => {
      const policy = buildContentSecurityPolicy("nonce-value", true);
      expect(policy).toContain("'nonce-nonce-value'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("upgrade-insecure-requests");
      expect(policy).toContain("img-src 'self' data: blob:");
      expect(policy).not.toContain("'unsafe-eval'");
      expect(policy).not.toContain("logrocket.io");
      expect(policy).not.toContain("media.example.test");
    });
  });

  it("allows telemetry origins only after the explicit approval build flag", () => {
    withEnvironment("NEXT_PUBLIC_LOGROCKET_BAA_APPROVED", "true", () => {
      withEnvironment("NEXT_PUBLIC_LOGROCKET_APP_ID", "org/app", () => {
        const policy = buildContentSecurityPolicy("nonce-value", true);
        expect(policy).toContain("https://cdn.logrocket.io");
        expect(policy).toContain("https://*.logrocket.io");
      });
    });
  });

  it("adds the configured HTTPS CDN origin only to image sources", () => {
    withEnvironment("MEDIA_CDN_ORIGIN", "https://media.example.test:8443", () => {
      const policy = buildContentSecurityPolicy("nonce-value", true);
      expect(policy).toContain("img-src 'self' data: blob: https://media.example.test:8443");
      expect(policy).not.toContain("connect-src 'self' https://media.example.test:8443");
    });
  });

  it.each([
    "http://media.example.test",
    "https://media.example.test/private",
    "https://user:password@media.example.test",
    "https://media.example.test?token=value",
  ])("rejects unsafe or non-origin CDN configuration: %s", (origin) => {
    withEnvironment("MEDIA_CDN_ORIGIN", origin, () => {
      expect(() => buildContentSecurityPolicy("nonce-value", true)).toThrow(/MEDIA_CDN_ORIGIN/);
    });
  });
});
