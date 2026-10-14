import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { JwtTokenService } from "@/lib/security/jwt";
import { hashApiKey } from "@/lib/security/api-key";

const tokens = new JwtTokenService();
export interface Principal {
  id: string;
  roles: Array<"USER" | "PATIENT" | "DOCTOR" | "ADMIN">;
  authSource: "cookie" | "bearer" | "api-key";
  scopes?: string[];
  apiKeyId?: string;
}

export async function getPrincipal(request: NextRequest): Promise<Principal | null> {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const cookie = request.cookies.get("access_token")?.value;
  if (bearer?.startsWith("mbk_live_")) return principalFromApiKey(bearer);
  const token = bearer ?? cookie;
  if (!token) return null;
  let userId: string | undefined;
  try {
    const payload = await tokens.verifyAccess(token);
    userId = payload.sub;
  } catch { return null; }
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE", deletedAt: null },
    select: { id: true, role: true, patientProfile: { select: { id: true, deletedAt: true } }, doctorProfile: { select: { id: true, deletedAt: true, verificationStatus: true } } },
  });
  if (!user) return null;
  return { id: user.id, roles: rolesFor(user), authSource: bearer ? "bearer" : "cookie" };
}

async function principalFromApiKey(token: string): Promise<Principal | null> {
  if (token.length > 128 || !/^mbk_live_[a-f0-9]{12}_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = new Date();
  const key = await prisma.apiKey.findFirst({
    where: { keyHash: hashApiKey(token), revokedAt: null, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], owner: { status: "ACTIVE", deletedAt: null } },
    select: { id: true, scopes: true, lastUsedAt: true, owner: { select: { id: true, role: true, patientProfile: { select: { id: true, deletedAt: true } }, doctorProfile: { select: { id: true, deletedAt: true, verificationStatus: true } } } } },
  });
  if (!key) return null;
  if (!key.lastUsedAt || key.lastUsedAt.getTime() < now.getTime() - 5 * 60_000) {
    await prisma.apiKey.updateMany({ where: { id: key.id, revokedAt: null, lastUsedAt: key.lastUsedAt ? { lte: new Date(now.getTime() - 5 * 60_000) } : null }, data: { lastUsedAt: now } });
  }
  return { id: key.owner.id, roles: rolesFor(key.owner), authSource: "api-key", scopes: key.scopes, apiKeyId: key.id };
}

function rolesFor(user: { role: string; patientProfile: { id: string; deletedAt: Date | null } | null; doctorProfile: { id: string; deletedAt: Date | null; verificationStatus: string } | null }): Principal["roles"] {
  const roles: Principal["roles"] = ["USER"];
  if (user.role === "ADMIN") roles.push("ADMIN");
  if (user.patientProfile && !user.patientProfile.deletedAt) roles.push("PATIENT");
  if (user.doctorProfile && !user.doctorProfile.deletedAt && user.doctorProfile.verificationStatus === "VERIFIED") roles.push("DOCTOR");
  return roles;
}
