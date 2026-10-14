import { randomUUID } from "node:crypto";
import type { OtpChannel, OtpPurpose, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { identifierHash } from "@/lib/security/otp";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import type { AuthRepository, NewRefreshToken, OtpChallengeRecord, RefreshTokenRecord, UserAuthRecord } from "@/modules/identity/application/auth.ports";

const fieldEncryption = new FieldEncryptionService();
const userAuthSelect = {
  id: true, name: true, email: true, emailCiphertext: true, emailNonce: true, emailAuthTag: true, emailEncryptionKeyVersion: true,
  nameCiphertext: true, nameNonce: true, nameAuthTag: true, nameEncryptionKeyVersion: true,
  passwordHash: true, role: true, status: true, deletedAt: true, failedLoginAttempts: true, lockedUntil: true,
  patientProfile: { select: { id: true, deletedAt: true } },
  doctorProfile: { select: { id: true, deletedAt: true, verificationStatus: true } },
} as const;

export class PrismaAuthRepository implements AuthRepository {
  async findUserByEmail(email: string): Promise<UserAuthRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await prisma.user.findFirst({
      where: { deletedAt: null, OR: [{ emailLookupHash: identifierHash(normalizedEmail) }, { email: normalizedEmail }] },
      select: userAuthSelect,
    });
    return row ? toAuthRecord(row) : null;
  }

  async recordLoginFailure(userId: string, now: Date, threshold: number, lockUntil: Date): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ failed_login_attempts: number; locked_until: Date | null }>>`
        UPDATE users
        SET failed_login_attempts = CASE
              WHEN locked_until > ${now} THEN failed_login_attempts
              WHEN locked_until IS NOT NULL AND locked_until <= ${now} THEN 1
              ELSE failed_login_attempts + 1
            END,
            locked_until = CASE
              WHEN locked_until > ${now} THEN locked_until
              WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= ${now} THEN 1 ELSE failed_login_attempts + 1 END) >= ${threshold} THEN ${lockUntil}
              ELSE NULL
            END,
            updated_at = ${now}
        WHERE id = ${userId} AND status = 'ACTIVE' AND deleted_at IS NULL
        RETURNING failed_login_attempts, locked_until
      `;
      const row = rows[0];
      if (!row) return { failedAttempts: 0, lockedUntil: null };
      await tx.auditLog.create({ data: {
        actorUserId: userId, action: "AUTH_LOGIN_FAILED", resourceType: "USER", resourceId: userId,
        metadata: { failedAttempts: row.failed_login_attempts, locked: Boolean(row.locked_until && row.locked_until > now) },
      } });
      return { failedAttempts: row.failed_login_attempts, lockedUntil: row.locked_until };
    }, { isolationLevel: "ReadCommitted" });
  }

  async clearLoginFailures(userId: string, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: userId, status: "ACTIVE", deletedAt: null, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      if (result.count === 1) await tx.auditLog.create({ data: { actorUserId: userId, action: "AUTH_LOGIN_SUCCEEDED", resourceType: "USER", resourceId: userId } });
    });
  }

  async createPatientUser(input: { name: string; email: string; passwordHash: string }): Promise<UserAuthRecord> {
    const id = randomUUID();
    const encryptedEmail = fieldEncryption.encrypt(input.email, `user:${id}:email`);
    const encryptedName = fieldEncryption.encrypt(input.name, `user:${id}:name`);
    const row = await prisma.user.create({
      data: {
        id, name: null, email: null, emailLookupHash: identifierHash(input.email),
        emailCiphertext: new Uint8Array(encryptedEmail.ciphertext), emailNonce: new Uint8Array(encryptedEmail.nonce),
        emailAuthTag: new Uint8Array(encryptedEmail.authTag), emailEncryptionKeyVersion: encryptedEmail.keyVersion,
        nameCiphertext: new Uint8Array(encryptedName.ciphertext), nameNonce: new Uint8Array(encryptedName.nonce),
        nameAuthTag: new Uint8Array(encryptedName.authTag), nameEncryptionKeyVersion: encryptedName.keyVersion,
        passwordHash: input.passwordHash, status: "PENDING_VERIFICATION", patientProfile: { create: {} },
      },
      select: userAuthSelect,
    });
    return toAuthRecord(row);
  }

  createOtp(input: { id: string; userId: string | null; identifierHash: string; channel: OtpChannel; purpose: OtpPurpose; codeHash: string; expiresAt: Date }) {
    return prisma.otpChallenge.create({ data: input, select: { id: true } });
  }
  getOtp(id: string): Promise<OtpChallengeRecord | null> {
    return prisma.otpChallenge.findFirst({ where: { id, deletedAt: null }, select: { id: true, userId: true, identifierHash: true, channel: true, purpose: true, codeHash: true, attempts: true, maxAttempts: true, expiresAt: true, consumedAt: true } });
  }
  async incrementOtpAttempts(id: string): Promise<void> {
    await prisma.otpChallenge.updateMany({ where: { id, consumedAt: null, deletedAt: null, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
  }
  async completeOtp(input: { challengeId: string; now: Date; activateUserId?: string; phone?: { userId: string; ciphertext: Buffer; nonce: Buffer; authTag: Buffer; lookupHash: string; keyVersion: string; verifiedAt: Date } }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.otpChallenge.updateMany({ where: { id: input.challengeId, consumedAt: null, deletedAt: null, expiresAt: { gt: input.now }, attempts: { lt: 5 } }, data: { consumedAt: input.now } });
      if (claimed.count !== 1) return false;
      if (input.activateUserId) {
        const activated = await tx.user.updateMany({ where: { id: input.activateUserId, status: "PENDING_VERIFICATION", deletedAt: null }, data: { status: "ACTIVE", emailVerified: input.now } });
        if (activated.count !== 1) throw new Error("Registration account is not pending verification");
      }
      if (input.phone) {
        await tx.user.update({ where: { id: input.phone.userId }, data: { phoneCiphertext: new Uint8Array(input.phone.ciphertext), phoneNonce: new Uint8Array(input.phone.nonce), phoneAuthTag: new Uint8Array(input.phone.authTag), phoneLookupHash: input.phone.lookupHash, phoneVerifiedAt: input.phone.verifiedAt, encryptionKeyVersion: input.phone.keyVersion } });
      }
      return true;
    }, { isolationLevel: "Serializable" });
  }
  async createRefreshToken(input: NewRefreshToken): Promise<void> { await prisma.refreshToken.create({ data: input }); }
  findRefreshToken(jti: string): Promise<RefreshTokenRecord | null> {
    return prisma.refreshToken.findFirst({ where: { jti, deletedAt: null }, select: { id: true, userId: true, familyId: true, jti: true, tokenHash: true, expiresAt: true, revokedAt: true } });
  }
  async isActiveUser(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
    return Boolean(user);
  }
  async rotateRefreshToken(oldJti: string, next: NewRefreshToken, now: Date): Promise<"ROTATED" | "REPLAY" | "INVALID"> {
    return prisma.$transaction(async (tx) => {
      // Row-level lock serializes refresh attempts for a token and makes replay detection reliable.
      const rows = await tx.$queryRaw<Array<{ id: string; user_id: string; family_id: string; expires_at: Date; revoked_at: Date | null }>>`
        SELECT id, user_id, family_id, expires_at, revoked_at
        FROM refresh_tokens WHERE jti = ${oldJti} AND deleted_at IS NULL FOR UPDATE
      `;
      const old = rows[0];
      if (!old || old.user_id !== next.userId || old.family_id !== next.familyId || old.expires_at <= now) return "INVALID";
      if (old.revoked_at) {
        await tx.refreshToken.updateMany({ where: { familyId: old.family_id, revokedAt: null }, data: { revokedAt: now } });
        return "REPLAY";
      }
      const claimed = await tx.refreshToken.updateMany({ where: { id: old.id, revokedAt: null }, data: { revokedAt: now, replacedByJti: next.jti } });
      if (claimed.count !== 1) {
        await tx.refreshToken.updateMany({ where: { familyId: old.family_id, revokedAt: null }, data: { revokedAt: now } });
        return "REPLAY";
      }
      await tx.refreshToken.create({ data: next });
      return "ROTATED";
    }, { isolationLevel: "ReadCommitted" });
  }
  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } });
  }
  async revokeJti(jti: string, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { jti, revokedAt: null }, data: { revokedAt: now } });
  }
}

type AuthRow = Prisma.UserGetPayload<{ select: typeof userAuthSelect }>;
function toAuthRecord(row: AuthRow): UserAuthRecord {
  const email = row.emailCiphertext && row.emailNonce && row.emailAuthTag && row.emailEncryptionKeyVersion
    ? fieldEncryption.decrypt({ ciphertext: Buffer.from(row.emailCiphertext), nonce: Buffer.from(row.emailNonce), authTag: Buffer.from(row.emailAuthTag), keyVersion: row.emailEncryptionKeyVersion }, `user:${row.id}:email`)
    : row.email;
  const name = row.nameCiphertext && row.nameNonce && row.nameAuthTag && row.nameEncryptionKeyVersion
    ? fieldEncryption.decrypt({ ciphertext: Buffer.from(row.nameCiphertext), nonce: Buffer.from(row.nameNonce), authTag: Buffer.from(row.nameAuthTag), keyVersion: row.nameEncryptionKeyVersion }, `user:${row.id}:name`)
    : row.name;
  return {
    id: row.id, name, email, passwordHash: row.passwordHash, role: row.role, status: row.status,
    deletedAt: row.deletedAt, failedLoginAttempts: row.failedLoginAttempts, lockedUntil: row.lockedUntil,
    patientProfile: row.patientProfile, doctorProfile: row.doctorProfile,
  };
}
