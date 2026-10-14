import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/observability/logger";

const resourceGroups: Array<[string, string]> = [
  ["/api/v1/auth", "AUTH"],
  ["/api/v1/bookings", "BOOKING"],
  ["/api/v1/patient", "PATIENT"],
  ["/api/v1/provider", "PROVIDER"],
  ["/api/v1/waitlist", "WAITLIST"],
  ["/api/v1/notifications", "NOTIFICATION"],
  ["/api/v1/account/api-keys", "API_KEY"],
  ["/api/v1/organizations", "ORGANIZATION"],
];
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/** Redacted audit writer. Query strings and request bodies are intentionally never persisted. */
export async function recordSensitiveApiEvent(input: {
  userId: string | null; requestId: string; method: string; pathname: string; status: number; authSource?: string;
}): Promise<void> {
  const group = resourceGroups.find(([prefix]) => input.pathname === prefix || input.pathname.startsWith(`${prefix}/`));
  if (!group) return;
  const resourceId = input.pathname.match(uuidPattern)?.[0] ?? null;
  try {
    await prisma.auditLog.create({ data: {
      actorUserId: input.userId,
      action: `API_${input.method}_${input.status}`.slice(0, 120),
      resourceType: group[1], resourceId, requestId: input.requestId,
      metadata: { method: input.method, status: input.status, routeGroup: group[1], authSource: input.authSource ?? "anonymous" },
    } });
  } catch (error) {
    // The API must not log sensitive payloads while reporting an audit subsystem failure.
    logger.error({ requestId: input.requestId, errorName: error instanceof Error ? error.name : "UnknownError" }, "security audit write failed");
  }
}
