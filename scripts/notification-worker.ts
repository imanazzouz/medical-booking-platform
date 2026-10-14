import "dotenv/config";
import { setTimeout as sleep } from "node:timers/promises";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { NotificationWorkerService } from "@/modules/notifications/application/notification-worker.service";
import { PrismaNotificationWorkerRepository } from "@/modules/notifications/infrastructure/prisma-notification-worker.repository";
import { ConfiguredNotificationTransport } from "@/modules/notifications/infrastructure/configured-notification-transport";

const worker = new NotificationWorkerService(new PrismaNotificationWorkerRepository(), new ConfiguredNotificationTransport(), new FieldEncryptionService());
let stopping = false;
process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });

async function main() {
  logger.info("notification worker started");
  try {
    while (!stopping) {
      const result = await worker.processBatch(50);
      if (result.processed === 0) await sleep(1_500);
    }
  } finally {
    await prisma.$disconnect();
    logger.info("notification worker stopped");
  }
}

main().catch((error: unknown) => {
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "notification worker crashed");
  process.exitCode = 1;
});
