import "dotenv/config";
import { setTimeout as sleep } from "node:timers/promises";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";
import { availabilityMaintenanceService } from "@/modules/scheduling/infrastructure/availability.module";

const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RETRY_DELAY_MS = 60 * 1000;
let stopping = false;
process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });

async function main() {
  logger.info("availability materialization worker started");
  try {
    while (!stopping) {
      const startedAt = Date.now();
      try {
        const result = await availabilityMaintenanceService.run();
        const details = { ...result, durationMs: Date.now() - startedAt };
        if (result.failures.length) logger.error(details, "availability horizon reconciled with failed services");
        else logger.info(details, "availability horizon reconciled");
        if (!stopping) await sleep(RUN_INTERVAL_MS);
      } catch (error) {
        logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "availability horizon reconciliation failed");
        if (!stopping) await sleep(RETRY_DELAY_MS);
      }
    }
  } finally {
    await prisma.$disconnect();
    logger.info("availability materialization worker stopped");
  }
}

main().catch((error: unknown) => {
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "availability worker crashed");
  process.exitCode = 1;
});
