import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { UnauthorizedError } from "@/lib/http/errors";

const ISSUER = "medical-booking";
const AUDIENCE = "medical-booking-api";
const accessSecret = () => new TextEncoder().encode(getEnv().ACCESS_TOKEN_SECRET);
const refreshSecret = () => new TextEncoder().encode(getEnv().REFRESH_TOKEN_SECRET);
export interface TokenPair { accessToken: string; refreshToken: string; accessExpiresIn: number; refreshJti: string; familyId: string }

export class JwtTokenService {
  async issue(userId: string, familyId: string = randomUUID()): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const refreshJti = randomUUID();
    const accessExpiresIn = 10 * 60;
    const accessToken = await new SignJWT({ typ: "access" }).setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(userId).setIssuedAt(now).setExpirationTime(now + accessExpiresIn).sign(accessSecret());
    const refreshToken = await new SignJWT({ typ: "refresh", fid: familyId }).setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(userId).setJti(refreshJti).setIssuedAt(now).setExpirationTime(now + 30 * 24 * 60 * 60).sign(refreshSecret());
    return { accessToken, refreshToken, accessExpiresIn, refreshJti, familyId };
  }

  async verifyAccess(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, accessSecret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
      if (payload.typ !== "access" || !payload.sub) throw new Error("wrong token type");
      return payload;
    } catch { throw new UnauthorizedError("جلسة الدخول غير صالحة أو منتهية"); }
  }

  async verifyRefresh(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, refreshSecret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
      if (payload.typ !== "refresh" || !payload.sub || !payload.jti || typeof payload.fid !== "string") throw new Error("wrong token type");
      return payload;
    } catch { throw new UnauthorizedError("رمز التجديد غير صالح أو منتهي"); }
  }

  digest(token: string): string { return createHash("sha256").update(token).digest("hex"); }
  matchesDigest(token: string, expectedHex: string): boolean {
    const actual = Buffer.from(this.digest(token), "hex");
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
