import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";
import { pingRateLimitStore } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Readiness check for orchestration; returns no dependency details or configuration. */
export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, pingRateLimitStore()]);
    return NextResponse.json({ status: "ready" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logger.warn({ errorName: error instanceof Error ? error.name : "UnknownError" }, "readiness check failed");
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "10" } });
  }
}
