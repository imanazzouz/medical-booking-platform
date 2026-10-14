import { describe, expect, it, vi } from "vitest";
import { AuthService } from "@/modules/identity/application/auth.service";
import type { AuthRepository } from "@/modules/identity/application/auth.ports";
import type { OtpDelivery } from "@/lib/security/otp-delivery";
import { JwtTokenService } from "@/lib/security/jwt";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { UnauthorizedError } from "@/lib/http/errors";
import { passwordHasher } from "@/lib/security/password";

describe("AuthService", () => {
  it("creates a pending patient and delivers an OTP without returning the code", async () => {
    const repo = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createPatientUser: vi.fn().mockResolvedValue({ id: "user-id", name: "Test Patient" }),
      createOtp: vi.fn().mockImplementation(async ({ id }) => ({ id })),
    } as unknown as AuthRepository;
    const delivery = { send: vi.fn().mockResolvedValue(undefined) } as unknown as OtpDelivery;
    const service = new AuthService(repo, delivery, {} as JwtTokenService, {} as FieldEncryptionService);
    const result = await service.registerPatient({ name: "Test Patient", email: "patient@example.test", password: "StrongPass1234" });
    expect(result.challengeId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repo.createPatientUser).toHaveBeenCalledOnce();
    expect(delivery.send).toHaveBeenCalledOnce();
    expect(delivery.send).toHaveBeenCalledWith("EMAIL", "patient@example.test", expect.stringMatching(/^\d{6}$/));
    expect(result).not.toHaveProperty("code");
    expect(Object.keys(result)).toEqual(["challengeId"]);
  });

  it("does not disclose whether an unverified account exists when resending", async () => {
    const repo = { findUserByEmail: vi.fn().mockResolvedValue(null), createOtp: vi.fn() } as unknown as AuthRepository;
    const delivery = { send: vi.fn() } as unknown as OtpDelivery;
    const service = new AuthService(repo, delivery, {} as JwtTokenService, {} as FieldEncryptionService);
    await expect(service.resendRegistrationOtp("missing@example.test")).resolves.toBeUndefined();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it("records a failed login and applies the five-attempt lockout policy", async () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    const repository = {
      findUserByEmail: vi.fn().mockResolvedValue({ id: "u1", name: null, email: "patient@example.test", passwordHash: "hash", role: "USER", status: "ACTIVE", deletedAt: null, failedLoginAttempts: 4, lockedUntil: null, patientProfile: { id: "p1", deletedAt: null }, doctorProfile: null }),
      recordLoginFailure: vi.fn().mockResolvedValue({ failedAttempts: 5, lockedUntil: new Date(now.getTime() + 900_000) }),
      clearLoginFailures: vi.fn(),
    } as unknown as AuthRepository;
    const verify = vi.spyOn(passwordHasher, "verify").mockResolvedValue(false);
    const service = new AuthService(repository, {} as OtpDelivery, {} as JwtTokenService, {} as FieldEncryptionService, () => now);
    await expect(service.login({ email: "patient@example.test", password: "wrong", accountType: "PATIENT" })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.recordLoginFailure).toHaveBeenCalledWith("u1", now, 5, new Date(now.getTime() + 900_000));
    expect(repository.clearLoginFailures).not.toHaveBeenCalled();
    verify.mockRestore();
  });

  it("does not extend or increment an already active account lockout", async () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    const repository = {
      findUserByEmail: vi.fn().mockResolvedValue({ id: "u1", name: null, email: "patient@example.test", passwordHash: "hash", role: "USER", status: "ACTIVE", deletedAt: null, failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + 60_000), patientProfile: { id: "p1", deletedAt: null }, doctorProfile: null }),
      recordLoginFailure: vi.fn(), clearLoginFailures: vi.fn(),
    } as unknown as AuthRepository;
    const verify = vi.spyOn(passwordHasher, "verify").mockResolvedValue(true);
    const service = new AuthService(repository, {} as OtpDelivery, {} as JwtTokenService, {} as FieldEncryptionService, () => now);
    await expect(service.login({ email: "patient@example.test", password: "correct", accountType: "PATIENT" })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.recordLoginFailure).not.toHaveBeenCalled();
    expect(repository.clearLoginFailures).not.toHaveBeenCalled();
    verify.mockRestore();
  });

  it("rotates refresh tokens and rejects a replayed token family", async () => {
    const repository = {
      findRefreshToken: vi.fn().mockResolvedValue({ id: "rt1", userId: "u1", familyId: "f1", jti: "jti-old", tokenHash: "old-hash", expiresAt: new Date("2035-01-01"), revokedAt: null }),
      isActiveUser: vi.fn().mockResolvedValue(true),
      rotateRefreshToken: vi.fn().mockResolvedValue("REPLAY"),
      revokeFamily: vi.fn(),
    } as unknown as AuthRepository;
    const jwt = {
      verifyRefresh: vi.fn().mockResolvedValue({ sub: "u1", fid: "f1", jti: "jti-old" }),
      matchesDigest: vi.fn().mockReturnValue(true),
      issue: vi.fn().mockResolvedValue({ accessToken: "new-access", refreshToken: "new-refresh", accessExpiresIn: 600, refreshJti: "jti-new", familyId: "f1" }),
      digest: vi.fn().mockReturnValue("new-hash"),
    } as unknown as JwtTokenService;
    const service = new AuthService(repository, {} as OtpDelivery, jwt, {} as FieldEncryptionService);
    await expect(service.refresh("old-refresh")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.rotateRefreshToken).toHaveBeenCalledOnce();
  });
});
