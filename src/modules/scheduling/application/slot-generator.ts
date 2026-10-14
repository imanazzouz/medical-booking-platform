import { TZDate } from "@date-fns/tz";

export interface GenerationRule {
  id: string;
  weekday: number;
  startTime: Date;
  endTime: Date;
  timezone: string;
  validFrom: Date | null;
  validUntil: Date | null;
  doctorId: string | null;
  locationId: string | null;
  exceptions: Array<{ date: Date; type: "CLOSED" | "OPEN_EXTRA"; startTime: Date | null; endTime: Date | null }>;
}
export interface GeneratedSlot {
  availabilityRuleId: string;
  serviceId: string;
  doctorId: string | null;
  locationId: string | null;
  resourceKey: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
}

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const wallClock = (date: Date) => ({ hour: date.getUTCHours(), minute: date.getUTCMinutes() });
const isoWeekday = (date: TZDate) => ((date.getDay() + 6) % 7) + 1;

/**
 * Expand weekly local-time rules into UTC appointment slots. Durations are elapsed
 * minutes, while rule boundaries are interpreted in each provider's IANA timezone.
 * CLOSED exceptions win over both regular and extra-open windows for safety.
 */
export function generateSlots(input: {
  serviceId: string;
  durationMinutes: number;
  from: Date;
  to: Date;
  now: Date;
  rules: GenerationRule[];
}): GeneratedSlot[] {
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 24 * 60) {
    throw new Error("INVALID_SERVICE_DURATION");
  }
  const result = new Map<string, GeneratedSlot>();
  const durationMs = input.durationMinutes * 60_000;

  for (const rule of input.rules) {
    // Intl validates the zone before the loop; TZDate handles local DST rules.
    try { new Intl.DateTimeFormat("en", { timeZone: rule.timezone }); }
    catch { throw new Error("INVALID_TIMEZONE"); }
    const first = new TZDate(input.from.getTime(), rule.timezone);
    const last = new TZDate(input.to.getTime(), rule.timezone);
    const cursor = new TZDate(first.getTime(), rule.timezone);
    cursor.setHours(0, 0, 0, 0);
    const lastKey = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;

    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (key > lastKey) break;
      const inValidity = (!rule.validFrom || key >= dateKey(rule.validFrom)) && (!rule.validUntil || key <= dateKey(rule.validUntil));
      const exceptions = rule.exceptions.filter((exception) => dateKey(exception.date) === key);
      const windows: Array<{ start: Date; end: Date }> = [];

      if (inValidity && isoWeekday(cursor) === rule.weekday) {
        const start = wallClock(rule.startTime);
        const end = wallClock(rule.endTime);
        const window = localWindow(cursor, start.hour, start.minute, end.hour, end.minute, rule.timezone);
        if (window) windows.push(window);
      }
      for (const exception of exceptions) {
        if (exception.type !== "OPEN_EXTRA" || !exception.startTime || !exception.endTime) continue;
        const start = wallClock(exception.startTime);
        const end = wallClock(exception.endTime);
        const window = localWindow(cursor, start.hour, start.minute, end.hour, end.minute, rule.timezone);
        if (window) windows.push(window);
      }

      const closed = exceptions.filter((exception) => exception.type === "CLOSED");
      for (const window of windows) {
        // Invalid or DST-skipped windows are discarded rather than shifted silently.
        if (window.end <= window.start) continue;
        for (let startMs = window.start.getTime(); startMs + durationMs <= window.end.getTime(); startMs += durationMs) {
          const endMs = startMs + durationMs;
          if (startMs < input.from.getTime() || startMs >= input.to.getTime() || startMs <= input.now.getTime()) continue;
          const overlapsClosed = closed.some((exception) => {
            if (!exception.startTime || !exception.endTime) return true;
            const closeStart = wallClock(exception.startTime);
            const closeEnd = wallClock(exception.endTime);
            const closedStartMs = atLocalTime(cursor, closeStart.hour, closeStart.minute, rule.timezone).getTime();
            const closedEndMs = atLocalTime(cursor, closeEnd.hour, closeEnd.minute, rule.timezone).getTime();
            return startMs < closedEndMs && endMs > closedStartMs;
          });
          if (overlapsClosed) continue;

          const startsAt = new Date(startMs);
          const resourceKey = rule.doctorId
            ? `doctor:${rule.doctorId}`
            : `service:${input.serviceId}:location:${rule.locationId ?? "remote"}`;
          const uniqueKey = `${resourceKey}:${startsAt.toISOString()}`;
          if (!result.has(uniqueKey)) result.set(uniqueKey, {
            availabilityRuleId: rule.id, serviceId: input.serviceId, doctorId: rule.doctorId, locationId: rule.locationId,
            resourceKey, startsAt, endsAt: new Date(endMs), capacity: 1,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return [...result.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function localWindow(date: TZDate, startHour: number, startMinute: number, endHour: number, endMinute: number, timeZone: string): { start: Date; end: Date } | null {
  const start = atLocalTime(date, startHour, startMinute, timeZone);
  const end = atLocalTime(date, endHour, endMinute, timeZone);
  // A wall-clock value inside a DST gap is normalized by Date; discard it explicitly.
  if (!matchesWallTime(start, date, startHour, startMinute) || !matchesWallTime(end, date, endHour, endMinute)) return null;
  return { start, end };
}
function matchesWallTime(value: Date, date: TZDate, hour: number, minute: number): boolean {
  const local = new TZDate(value.getTime(), date.timeZone);
  return local.getFullYear() === date.getFullYear() && local.getMonth() === date.getMonth() && local.getDate() === date.getDate() && local.getHours() === hour && local.getMinutes() === minute;
}
function atLocalTime(date: TZDate, hour: number, minute: number, timeZone: string): Date {
  return new TZDate(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0, timeZone);
}
