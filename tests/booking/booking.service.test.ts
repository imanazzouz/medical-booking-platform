import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { BookingService } from "@/modules/booking/application/booking.service";
import type { BookingRepository } from "@/modules/booking/application/booking.ports";
import { ConflictError } from "@/lib/http/errors";

describe("BookingService", () => {
  it("uses an idempotency key to replay an identical booking safely", async () => {
    const record = { id: "appointment-id", patientId: "patient-id" };
    const slotId = "11111111-1111-4111-8111-111111111111";
    const requestHash = createHash("sha256").update(JSON.stringify({ slotId })).digest("hex");
    const repository = {
      patientIdForUser: vi.fn().mockResolvedValue("patient-id"),
      getByIdempotencyHash: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: record.id, patientId: "patient-id", requestHash }),
      createBooking: vi.fn().mockResolvedValue({ id: record.id }),
      getForPatient: vi.fn().mockResolvedValue({ id: record.id, status: "CONFIRMED" }),
    } as unknown as BookingRepository;
    const service = new BookingService(repository);
    const key = "idempotency-key-123456";
    const first = await service.book("user-1", slotId, key);
    const replay = await service.book("user-1", slotId, key);
    expect(first).toEqual({ id: record.id });
    expect(replay).toEqual({ id: record.id, status: "CONFIRMED" });
    expect(repository.createBooking).toHaveBeenCalledOnce();
  });

  it("maps database exclusion-constraint conflicts to a safe booking conflict", async () => {
    const repository = {
      patientIdForUser: vi.fn().mockResolvedValue("patient-id"),
      getByIdempotencyHash: vi.fn().mockResolvedValue(null),
      createBooking: vi.fn().mockRejectedValue({ code: "P2004" }),
    } as unknown as BookingRepository;
    const service = new BookingService(repository);
    await expect(service.book("user-1", "11111111-1111-4111-8111-111111111111", "idempotency-key-123456")).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a replay whose request payload does not match", async () => {
    const repository = {
      patientIdForUser: vi.fn().mockResolvedValue("patient-id"),
      getByIdempotencyHash: vi.fn().mockResolvedValue({ id: "old", patientId: "patient-id", requestHash: "not-the-current-hash" }),
      createBooking: vi.fn(),
    } as unknown as BookingRepository;
    const service = new BookingService(repository);
    await expect(service.book("user-1", "11111111-1111-4111-8111-111111111111", "idempotency-key-123456")).rejects.toBeInstanceOf(ConflictError);
    expect(repository.createBooking).not.toHaveBeenCalled();
  });
});
