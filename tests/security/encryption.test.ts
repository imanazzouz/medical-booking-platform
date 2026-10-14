import { describe, expect, it } from "vitest";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { MedicalRecordEncryptionService } from "@/modules/security/infrastructure/medical-record-encryption";

describe("field-level AES-256-GCM encryption", () => {
  it("round-trips data and binds authentication to the associated context", () => {
    const service = new FieldEncryptionService();
    const envelope = service.encrypt("private value", "user:user-1:email");
    expect(envelope.keyVersion).toBe("v1");
    expect(service.decrypt(envelope, "user:user-1:email")).toBe("private value");
    expect(() => service.decrypt(envelope, "user:user-2:email")).toThrow();
  });

  it("binds medical record title and content to record and patient IDs", () => {
    const service = new MedicalRecordEncryptionService();
    const encrypted = service.encrypt({ recordId: "record-1", patientId: "patient-1", title: "Report", content: "Confidential result" });
    expect(service.decrypt({ recordId: "record-1", patientId: "patient-1", ...encrypted })).toEqual({ title: "Report", content: "Confidential result" });
    expect(() => service.decrypt({ recordId: "record-1", patientId: "patient-2", ...encrypted })).toThrow();
  });
});
