import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { identifierHash } from "@/lib/security/otp";

const inputSchema = z.object({ email: z.string().email().max(320).transform((v) => v.toLowerCase()), password: z.string().min(16).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/) });
const parsed = inputSchema.safeParse({ email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD });
if (!parsed.success) throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and a strong BOOTSTRAP_ADMIN_PASSWORD in the runtime environment");

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (existing) throw new Error("An active admin already exists; refusing to bootstrap another one");
  const lookupHash = identifierHash(parsed.data.email);
  const emailExists = await prisma.user.findFirst({ where: { OR: [{ emailLookupHash: lookupHash }, { email: parsed.data.email }] }, select: { id: true } });
  if (emailExists) throw new Error("Email already belongs to a user; refusing privilege escalation");
  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const id = randomUUID();
  const encryptedEmail = new FieldEncryptionService().encrypt(parsed.data.email, `user:${id}:email`);
  await prisma.user.create({ data: {
    id, email: null, emailLookupHash: lookupHash,
    emailCiphertext: new Uint8Array(encryptedEmail.ciphertext), emailNonce: new Uint8Array(encryptedEmail.nonce),
    emailAuthTag: new Uint8Array(encryptedEmail.authTag), emailEncryptionKeyVersion: encryptedEmail.keyVersion,
    passwordHash, role: "ADMIN", status: "ACTIVE", emailVerified: new Date(),
  }, select: { id: true } });
  console.info("Bootstrap administrator created. Remove the bootstrap secrets from the environment now.");
} finally {
  await prisma.$disconnect();
}
