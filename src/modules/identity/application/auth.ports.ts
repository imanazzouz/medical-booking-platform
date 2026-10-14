import type { OtpChannel, OtpPurpose, UserRole, UserStatus } from "@prisma/client";

export interface UserAuthRecord {
  id: string; name: string | null; email: string | null; passwordHash: string | null; role: UserRole; status: UserStatus; deletedAt: Date | null;
  failedLoginAttempts: number; lockedUntil: Date | null;
  patientProfile: { id: string; deletedAt: Date | null } | null;
  doctorProfile: { id: string; deletedAt: Date | null; verificationStatus: string } | null;
}
export interface OtpChallengeRecord {
  id: string; userId: string | null; identifierHash: string; channel: OtpChannel; purpose: OtpPurpose;
  codeHash: string; attempts: number; maxAttempts: number; expiresAt: Date; consumedAt: Date | null;
}
export interface NewRefreshToken { userId: string; familyId: string; jti: string; tokenHash: string; expiresAt: Date; replacedByJti?: string }
export interface RefreshTokenRecord { id: string; userId: string; familyId: string; jti: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null }

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserAuthRecord | null>;
  recordLoginFailure(userId: string, now: Date, threshold: number, lockUntil: Date): Promise<{ failedAttempts: number; lockedUntil: Date | null }>;
  clearLoginFailures(userId: string, now: Date): Promise<void>;
  createPatientUser(input: { name: string; email: string; passwordHash: string }): Promise<UserAuthRecord>;
  createOtp(input: { id: string; userId: string | null; identifierHash: string; channel: OtpChannel; purpose: OtpPurpose; codeHash: string; expiresAt: Date }): Promise<{ id: string }>;
  getOtp(id: string): Promise<OtpChallengeRecord | null>;
  incrementOtpAttempts(id: string): Promise<void>;
  completeOtp(input: { challengeId: string; now: Date; activateUserId?: string; phone?: { userId: string; ciphertext: Buffer; nonce: Buffer; authTag: Buffer; lookupHash: string; keyVersion: string; verifiedAt: Date } }): Promise<boolean>;
  createRefreshToken(input: NewRefreshToken): Promise<void>;
  findRefreshToken(jti: string): Promise<RefreshTokenRecord | null>;
  isActiveUser(userId: string): Promise<boolean>;
  rotateRefreshToken(oldJti: string, newToken: NewRefreshToken, now: Date): Promise<"ROTATED" | "REPLAY" | "INVALID">;
  revokeFamily(familyId: string, now: Date): Promise<void>;
  revokeJti(jti: string, now: Date): Promise<void>;
}
