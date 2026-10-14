import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import type { WaitlistRepository } from "@/modules/booking/application/waitlist.ports";

const inputSchema = z.object({
  serviceId: z.string().uuid(),
  doctorId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  earliestAt: z.string().datetime({ offset: true }),
  latestAt: z.string().datetime({ offset: true }),
}).strict();

export class WaitlistService {
  constructor(private readonly repository: WaitlistRepository, private readonly now: () => Date = () => new Date()) {}

  async join(userId: string, raw: unknown) {
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError(parsed.error.issues);
    const { serviceId, earliestAt, latestAt } = parsed.data;
    const from = new Date(earliestAt);
    const to = new Date(latestAt);
    const now = this.now();
    if (from <= now || to <= from || to.getTime() - from.getTime() > 90 * 86_400_000) throw new ValidationError({ window: ["يجب أن تكون نافذة الانتظار مستقبلية وأقصر من 90 يوماً"] });
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError("يلزم وجود ملف مريض نشط");
    try {
      return await this.repository.create(userId, patientId, { serviceId, doctorId: parsed.data.doctorId ?? null, locationId: parsed.data.locationId ?? null, earliestAt: from, latestAt: to }, now);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "INVALID_RESOURCE") throw new ValidationError({ resource: ["الطبيب أو الموقع غير مرتبط بالخدمة"] });
      if (message === "SERVICE_NOT_FOUND") throw new NotFoundError("الخدمة غير متاحة");
      if (message === "WAITLIST_EXISTS" || hasPrismaCode(error, "P2002")) throw new ConflictError("لديك طلب نشط بالفعل لهذه الخدمة");
      if (hasPrismaCode(error, "P2034")) throw new ConflictError("تعارض طلب قائمة الانتظار مع عملية أخرى؛ حاول مجدداً");
      throw error;
    }
  }

  async list(userId: string) {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    return { items: await this.repository.list(patientId) };
  }

  async leave(userId: string, entryId: string) {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    if (!await this.repository.cancel(patientId, entryId, this.now())) throw new NotFoundError("طلب قائمة الانتظار غير موجود");
    return { id: entryId, cancelled: true };
  }

  async accept(userId: string, entryId: string) {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    try { return await this.repository.accept(patientId, entryId, `MB${randomBytes(12).toString("hex").toUpperCase()}`, this.now()); }
    catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "WAITLIST_NOT_FOUND") throw new NotFoundError("طلب قائمة الانتظار غير موجود");
      if (message === "OFFER_EXPIRED" || message === "OFFER_NOT_AVAILABLE") throw new ConflictError("انتهت مهلة العرض أو لم يعد الموعد متاحاً");
      if (hasPrismaCode(error, "P2034") || hasPrismaCode(error, "P2004")) throw new ConflictError("تعارض قبول العرض مع حجز آخر؛ أعد تحميل قائمة الانتظار");
      throw error;
    }
  }
}
function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}
