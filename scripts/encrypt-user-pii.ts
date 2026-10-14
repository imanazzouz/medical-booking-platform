import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { identifierHash } from "@/lib/security/otp";
import { logger } from "@/lib/observability/logger";

const encryption = new FieldEncryptionService();
const BATCH_SIZE = 200;

/** Idempotently encrypts legacy user email and patient-only names; never logs PII or plaintext. */
async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let migrated = 0;
  while (true) {
    const batch = await prisma.user.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: { id: "asc" }, take: BATCH_SIZE,
      select: {
        id: true, email: true, emailLookupHash: true, emailCiphertext: true,
        name: true, nameCiphertext: true,
        patientProfile: { select: { id: true } }, doctorProfile: { select: { id: true } },
      },
    });
    if (!batch.length) break;
    for (const user of batch) {
      scanned += 1;
      const data: Record<string, unknown> = {};
      if (user.email) {
        const encrypted = user.emailCiphertext ? null : encryption.encrypt(user.email, `user:${user.id}:email`);
        data.email = null;
        data.emailLookupHash = user.emailLookupHash ?? identifierHash(user.email);
        if (encrypted) {
          data.emailCiphertext = new Uint8Array(encrypted.ciphertext);
          data.emailNonce = new Uint8Array(encrypted.nonce);
          data.emailAuthTag = new Uint8Array(encrypted.authTag);
          data.emailEncryptionKeyVersion = encrypted.keyVersion;
        }
      }
      const patientOnly = Boolean(user.patientProfile && !user.doctorProfile);
      if (patientOnly && user.name && !user.nameCiphertext) {
        const encrypted = encryption.encrypt(user.name, `user:${user.id}:name`);
        data.name = null;
        data.nameCiphertext = new Uint8Array(encrypted.ciphertext);
        data.nameNonce = new Uint8Array(encrypted.nonce);
        data.nameAuthTag = new Uint8Array(encrypted.authTag);
        data.nameEncryptionKeyVersion = encrypted.keyVersion;
      } else if (patientOnly && user.name && user.nameCiphertext) {
        data.name = null;
      }
      if (!Object.keys(data).length) continue;
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({ where: { id: user.id, email: user.email, name: user.name }, data });
        if (updated.count !== 1) throw new Error("PII_BACKFILL_CONCURRENT_UPDATE");
        await tx.auditLog.create({ data: {
          action: "PII_ENCRYPTED", resourceType: "USER", resourceId: user.id,
          metadata: { email: Boolean(data.emailCiphertext), patientName: Boolean(data.nameCiphertext) },
        } });
      });
      migrated += 1;
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < BATCH_SIZE) break;
  }
  logger.info({ scanned, migrated }, "legacy user PII encryption completed");
}

main().catch((error: unknown) => {
  // Error details may include database context; never print SQL parameters or PII.
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "legacy user PII encryption failed");
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
