import { randomUUID } from "node:crypto";
import type { OtpChannel, OtpPurpose } from "@prisma/client";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/http/errors";
import { passwordHasher } from "@/lib/security/password";
import { createOtp, identifierHash, normalizeIdentifier, otpHash, constantTimeEqualHex } from "@/lib/security/otp";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { JwtTokenService, type TokenPair } from "@/lib/security/jwt";
import type { AuthRepository, NewRefreshToken, UserAuthRecord } from "@/modules/identity/application/auth.ports";
import type { OtpDelivery } from "@/lib/security/otp-delivery";
import type { RegisterDto, LoginDto, VerifyOtpDto, AuthenticatedUserResponseDto } from "@/modules/identity/application/auth.dto";

const dummyPasswordHash = passwordHasher.hash("constant-time-dummy-password-not-a-real-account");
const OTP_LIFETIME_MS = 5 * 60 * 1000;

export interface AuthResult { user: AuthenticatedUserResponseDto; tokens: TokenPair }

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly delivery: OtpDelivery,
    private readonly jwt: JwtTokenService,
    private readonly encryption: FieldEncryptionService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async registerPatient(input: RegisterDto): Promise<{ challengeId: string }> {
    const existing = await this.repository.findUserByEmail(input.email);
    if (existing) throw new ConflictError("تعذر إنشاء الحساب بهذه البيانات");
    const user = await this.repository.createPatientUser({ name: input.name, email: input.email, passwordHash: await passwordHasher.hash(input.password) });
    const challengeId = await this.createAndSendOtp({ userId: user.id, identifier: input.email, channel: "EMAIL", purpose: "REGISTRATION" });
    return { challengeId };
  }

  async resendRegistrationOtp(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(normalizeIdentifier(email));
    // The route returns the same response for existing and non-existing accounts.
    if (!user || user.status !== "PENDING_VERIFICATION") return;
    await this.createAndSendOtp({ userId: user.id, identifier: email, channel: "EMAIL", purpose: "REGISTRATION" });
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    const hash = user?.passwordHash ?? await dummyPasswordHash;
    const passwordIsValid = await passwordHasher.verify(hash, input.password).catch(() => false);
    const now = this.now();
    const locked = Boolean(user?.lockedUntil && user.lockedUntil > now);
    if (!user || !passwordIsValid || user.status !== "ACTIVE" || user.deletedAt || locked) {
      if (user && passwordIsValid === false && user.status === "ACTIVE" && !user.deletedAt && !locked) {
        await this.repository.recordLoginFailure(user.id, now, 5, new Date(now.getTime() + 15 * 60_000));
      }
      throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة");
    }
    this.assertAccountType(user, input.accountType);
    await this.repository.clearLoginFailures(user.id, now);
    const tokens = await this.createTokenPair(user.id);
    return { user: { id: user.id, name: user.name, email: user.email, accountType: input.accountType }, tokens };
  }

  async requestPhoneVerification(userId: string, phone: string): Promise<{ challengeId: string }> {
    const challengeId = await this.createAndSendOtp({ userId, identifier: phone, channel: "SMS", purpose: "PHONE_VERIFICATION" });
    return { challengeId };
  }

  async verifyOtp(input: VerifyOtpDto, expectedUserId?: string): Promise<{ verified: true }> {
    const challenge = await this.repository.getOtp(input.challengeId);
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= this.now() || challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedError("رمز التحقق غير صالح أو منتهي");
    }
    if (expectedUserId && challenge.userId !== expectedUserId) throw new UnauthorizedError("رمز التحقق غير صالح");
    const candidate = otpHash(input.code, challenge.id);
    if (!constantTimeEqualHex(candidate, challenge.codeHash)) {
      await this.repository.incrementOtpAttempts(challenge.id);
      throw new UnauthorizedError("رمز التحقق غير صالح أو منتهي");
    }
    if (challenge.channel === "SMS") {
      if (!expectedUserId || !input.phone || identifierHash(input.phone) !== challenge.identifierHash) throw new UnauthorizedError("رمز التحقق غير صالح");
    }
    if (challenge.purpose === "REGISTRATION") {
      if (!challenge.userId) throw new UnauthorizedError();
      const completed = await this.repository.completeOtp({ challengeId: challenge.id, now: this.now(), activateUserId: challenge.userId });
      if (!completed) throw new UnauthorizedError("رمز التحقق غير صالح أو منتهي");
    } else if (challenge.purpose === "PHONE_VERIFICATION") {
      if (!expectedUserId || !input.phone) throw new UnauthorizedError();
      const encrypted = this.encryption.encrypt(input.phone, `user:${expectedUserId}:phone`);
      const completed = await this.repository.completeOtp({ challengeId: challenge.id, now: this.now(), phone: {
        userId: expectedUserId, ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, authTag: encrypted.authTag,
        lookupHash: identifierHash(input.phone), keyVersion: encrypted.keyVersion, verifiedAt: this.now(),
      } });
      if (!completed) throw new UnauthorizedError("رمز التحقق غير صالح أو منتهي");
    } else {
      throw new ForbiddenError("هذا النوع من رموز التحقق غير مدعوم عبر هذا المسار");
    }
    return { verified: true };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const payload = await this.jwt.verifyRefresh(rawToken);
    const jti = payload.jti!;
    const record = await this.repository.findRefreshToken(jti);
    if (!record || record.userId !== payload.sub || record.familyId !== payload.fid) throw new UnauthorizedError("رمز التجديد غير صالح");
    if (!await this.repository.isActiveUser(record.userId)) {
      await this.repository.revokeFamily(record.familyId, this.now());
      throw new UnauthorizedError("الحساب غير نشط");
    }
    if (!this.jwt.matchesDigest(rawToken, record.tokenHash)) {
      await this.repository.revokeFamily(record.familyId, this.now());
      throw new UnauthorizedError("تم إبطال الجلسة لأسباب أمنية");
    }
    const pair = await this.jwt.issue(record.userId, record.familyId);
    const next: NewRefreshToken = {
      userId: record.userId, familyId: record.familyId, jti: pair.refreshJti,
      tokenHash: this.jwt.digest(pair.refreshToken), expiresAt: new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000),
    };
    const result = await this.repository.rotateRefreshToken(jti, next, this.now());
    if (result !== "ROTATED") throw new UnauthorizedError(result === "REPLAY" ? "تم اكتشاف إعادة استخدام رمز التجديد" : "رمز التجديد غير صالح");
    return pair;
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    try {
      const payload = await this.jwt.verifyRefresh(rawToken);
      await this.repository.revokeFamily(String(payload.fid), this.now());
    } catch { /* Logout remains idempotent for absent, expired, or malformed cookies. */ }
  }

  private async createAndSendOtp(input: { userId: string | null; identifier: string; channel: OtpChannel; purpose: OtpPurpose }): Promise<string> {
    const id = randomUUID();
    const code = createOtp();
    const challenge = await this.repository.createOtp({
      id, userId: input.userId,
      identifierHash: identifierHash(input.identifier),
      channel: input.channel,
      purpose: input.purpose,
      codeHash: otpHash(code, id),
      expiresAt: new Date(this.now().getTime() + OTP_LIFETIME_MS),
    });
    // Challenge IDs are server-generated UUIDs, and OTP itself is never returned or logged.
    await this.delivery.send(input.channel, input.identifier, code);
    return challenge.id;
  }

  private async createTokenPair(userId: string): Promise<TokenPair> {
    const pair = await this.jwt.issue(userId);
    await this.repository.createRefreshToken({
      userId, familyId: pair.familyId, jti: pair.refreshJti,
      tokenHash: this.jwt.digest(pair.refreshToken),
      expiresAt: new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000),
    });
    return pair;
  }

  private assertAccountType(user: UserAuthRecord, type: LoginDto["accountType"]): void {
    if (type === "ADMIN" && user.role !== "ADMIN") throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة");
    if (type === "PATIENT" && (!user.patientProfile || user.patientProfile.deletedAt)) throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة");
    if (type === "DOCTOR" && (!user.doctorProfile || user.doctorProfile.deletedAt || user.doctorProfile.verificationStatus !== "VERIFIED")) {
      throw new UnauthorizedError("حساب الطبيب غير مفعل أو غير معتمد");
    }
  }
}
