import { describe, expect, it } from "vitest";
import { createCsrfToken, verifyCsrfToken } from "@/lib/security/csrf";

describe("signed double-submit CSRF tokens", () => {
  it("validates only an identical signed cookie/header pair", () => {
    const token = createCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
    expect(verifyCsrfToken(token, `${token.slice(0, -1)}x`)).toBe(false);
    expect(verifyCsrfToken(undefined, token)).toBe(false);
    expect(verifyCsrfToken(token, null)).toBe(false);
  });

  it("rejects a token with a modified signature", () => {
    const token = createCsrfToken();
    const tampered = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;
    expect(verifyCsrfToken(tampered, tampered)).toBe(false);
  });
});
