import "dotenv/config";
import { setTimeout as sleep } from "node:timers/promises";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";
import { bookingMaintenanceService } from "@/modules/booking/infrastructure/booking-maintenance.module";

let stopping = false;
process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });

async function main() {
  logger.info("booking maintenance worker started");
  try {
    while (!stopping) {
      try {
        const result = await bookingMaintenanceService.runBatch(50);
        if (result.pendingApprovals || result.waitlistOffers) logger.info(result, "booking reservations expired");
        if (result.pendingApprovals + result.waitlistOffers === 0) await sleep(5_000);
      } catch (error) {
        logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "booking maintenance batch failed");
        await sleep(2_000);
      }
    }
  } finally {
    await prisma.$disconnect();
    logger.info("booking maintenance worker stopped");
  }
}
main().catch((error: unknown) => {
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "booking maintenance worker crashed");
  process.exitCode = 1;
});
