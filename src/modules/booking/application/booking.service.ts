import { randomBytes, createHash } from "node:crypto";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/http/errors";
import type { AppointmentResponseDto } from "@/modules/booking/application/booking.dto";
import { identifierHash } from "@/lib/security/otp";
import type { BookingRepository } from "@/modules/booking/application/booking.ports";
import type { Principal } from "@/lib/http/auth-guard";

export class BookingService {
  constructor(private readonly repository: BookingRepository, private readonly now: () => Date = () => new Date()) {}

  async book(userId: string, slotId: string, idempotencyKey: string): Promise<AppointmentResponseDto> {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError("يلزم وجود ملف مريض نشط للحجز");
    const keyHash = identifierHash(`${userId}:${idempotencyKey}`);
    const requestHash = createHash("sha256").update(JSON.stringify({ slotId })).digest("hex");
    const existing = await this.repository.getByIdempotencyHash(keyHash);
    if (existing) {
      if (existing.patientId !== patientId || existing.requestHash !== requestHash) throw new ConflictError("مفتاح الطلب مستخدم لطلب مختلف");
      const replay = await this.repository.getForPatient(existing.id, patientId);
      if (!replay) throw new NotFoundError("الحجز غير موجود");
      return replay;
    }
    const bookingReference = `MB${randomBytes(12).toString("hex").toUpperCase()}`;
    try {
      return await this.repository.createBooking({ patientId, slotId, bookingReference, idempotencyKeyHash: keyHash, requestHash, now: this.now() });
    } catch (error) {
      const marker = error instanceof Error ? error.message : "";
      if (marker === "SLOT_UNAVAILABLE") throw new ConflictError("الفترة لم تعد متاحة؛ اختر موعداً آخر");
      if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) {
        const raced = await this.repository.getByIdempotencyHash(keyHash);
        if (raced?.patientId === patientId && raced.requestHash === requestHash) {
          const replay = await this.repository.getForPatient(raced.id, patientId);
          if (!replay) throw new NotFoundError("الحجز غير موجود");
          return replay;
        }
        if (raced) throw new ConflictError("مفتاح الطلب مستخدم لطلب مختلف");
        throw new ConflictError("تعذر حجز الفترة بسبب طلب متزامن؛ حاول مجدداً");
      }
      if (isPrismaCode(error, "P2004")) throw new ConflictError("الفترة متعارضة مع مورد آخر؛ اختر موعداً مختلفاً");
      throw error;
    }
  }

  async cancel(appointmentId: string, principal: Principal) {
    const patientId = await this.repository.patientIdForUser(principal.id);
    if (!patientId) throw new ForbiddenError();
    try { return await this.repository.cancelBooking({ appointmentId, patientId, now: this.now() }); }
    catch (error) {
      const marker = error instanceof Error ? error.message : "";
      if (marker === "APPOINTMENT_NOT_FOUND") throw new NotFoundError("الموعد غير موجود");
      if (marker === "APPOINTMENT_NOT_CANCELLABLE") throw new ConflictError("لا يمكن إلغاء هذا الموعد في حالته الحالية");
      if (marker === "SLOT_CAPACITY_CONFLICT" || isPrismaCode(error, "P2034")) throw new ConflictError("تعارض تحديث السعة؛ حدّث الموعد وحاول مجدداً");
      throw error;
    }
  }

  async reschedule(appointmentId: string, slotId: string, idempotencyKey: string, principal: Principal): Promise<AppointmentResponseDto> {
    const key = idempotencyKey.trim();
    if (key.length < 16 || key.length > 200) throw new ConflictError("مفتاح Idempotency-Key غير صالح");
    const keyHash = identifierHash(`${principal.id}:reschedule:${key}`);
    const requestHash = createHash("sha256").update(JSON.stringify({ appointmentId, slotId, operation: "reschedule" })).digest("hex");
    const existing = await this.repository.getMutationIdempotency(principal.id, keyHash, this.now());
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ConflictError("مفتاح الطلب مستخدم لعملية مختلفة");
      const replay = await this.repository.getForPatient(existing.appointmentId, await this.requirePatientId(principal.id));
      if (!replay) throw new NotFoundError("الموعد غير موجود");
      return replay;
    }
    const patientId = await this.requirePatientId(principal.id);
    try {
      return await this.repository.rescheduleBooking({ userId: principal.id, appointmentId, patientId, slotId, keyHash, requestHash, now: this.now() });
    } catch (error) {
      const marker = error instanceof Error ? error.message : "";
      if (marker === "APPOINTMENT_NOT_FOUND") throw new NotFoundError("الموعد غير موجود");
      if (marker === "RESCHEDULE_POLICY") throw new ConflictError("انتهت مهلة إعادة الجدولة لهذا الموعد");
      if (marker === "SLOT_UNAVAILABLE") throw new ConflictError("الفترة الجديدة لم تعد متاحة");
      if (marker === "SERVICE_MISMATCH") throw new ConflictError("يمكن إعادة الجدولة إلى فترة للخدمة نفسها فقط");
      if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) {
        const raced = await this.repository.getMutationIdempotency(principal.id, keyHash, this.now());
        if (raced?.requestHash === requestHash) {
          const replay = await this.repository.getForPatient(raced.appointmentId, patientId);
          if (replay) return replay;
        }
        throw new ConflictError("تعارضت إعادة الجدولة مع طلب آخر؛ حدّث المواعيد وحاول مجدداً");
      }
      if (isPrismaCode(error, "P2004")) throw new ConflictError("الفترة الجديدة متعارضة مع مورد آخر؛ اختر موعداً مختلفاً");
      throw error;
    }
  }

  async decide(appointmentId: string, actorUserId: string, decision: "APPROVE" | "REJECT") {
    try { return await this.repository.decideBooking({ appointmentId, actorUserId, decision, now: this.now() }); }
    catch (error) {
      const marker = error instanceof Error ? error.message : "";
      if (marker === "APPOINTMENT_NOT_FOUND") throw new NotFoundError("طلب الحجز غير موجود");
      if (marker === "NOT_AUTHORIZED") throw new ForbiddenError();
      if (marker === "APPOINTMENT_NOT_PENDING" || marker === "HOLD_EXPIRED") throw new ConflictError("لم يعد بالإمكان اتخاذ قرار على هذا الطلب");
      if (marker === "SLOT_CAPACITY_CONFLICT" || isPrismaCode(error, "P2034")) throw new ConflictError("تعارض قرار الحجز مع تحديث آخر؛ أعد تحميل الطلب");
      throw error;
    }
  }

  private async requirePatientId(userId: string): Promise<string> {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    return patientId;
  }

  async listForProvider(userId: string, page: number, pageSize: number) {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
    try { return await this.repository.listForProvider(userId, safePage, safePageSize); }
    catch (error) {
      if (error instanceof Error && error.message === "NOT_AUTHORIZED") throw new ForbiddenError();
      throw error;
    }
  }

  async list(userId: string, page: number, pageSize: number) {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    return this.repository.listForPatient(patientId, page, pageSize);
  }

  async get(appointmentId: string, userId: string) {
    const patientId = await this.repository.patientIdForUser(userId);
    if (!patientId) throw new ForbiddenError();
    const result = await this.repository.getForPatient(appointmentId, patientId);
    if (!result) throw new NotFoundError("الموعد غير موجود");
    return result;
  }
}
function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}
