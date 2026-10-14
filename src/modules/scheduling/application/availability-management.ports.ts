import type { AvailabilityExceptionType } from "@prisma/client";
import type { GeneratedSlot } from "@/modules/scheduling/application/slot-generator";

export interface RuleInput {
  serviceId: string;
  doctorId: string | null;
  locationId: string | null;
  weekday: number;
  startTime: Date;
  endTime: Date;
  timezone: string;
  validFrom: Date | null;
  validUntil: Date | null;
}
export interface ExceptionInput {
  ruleId: string;
  date: Date;
  type: AvailabilityExceptionType;
  startTime: Date | null;
  endTime: Date | null;
  internalReason: string | null;
}
export interface AvailabilityManagementRepository {
  canManageService(userId: string, serviceId: string): Promise<boolean>;
  listRules(serviceId: string): Promise<unknown[]>;
  createRule(userId: string, input: RuleInput): Promise<unknown | null>;
  replaceRule(userId: string, ruleId: string, input: RuleInput): Promise<unknown | null>;
  deleteRule(userId: string, ruleId: string, now: Date): Promise<boolean>;
  createException(userId: string, input: ExceptionInput): Promise<unknown | null>;
  deleteException(userId: string, exceptionId: string, now: Date): Promise<boolean>;
  generateForService(userId: string, serviceId: string, from: Date, to: Date, now: Date): Promise<{ created: number; slots: GeneratedSlot[] }>;
  generateHorizon(from: Date, to: Date, now: Date): Promise<{ services: number; created: number; reactivated: number; skippedConflicts: number; failures: Array<{ serviceId: string; code: string }> }>;
}
