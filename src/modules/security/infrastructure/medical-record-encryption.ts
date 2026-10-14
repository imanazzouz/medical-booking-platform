import { FieldEncryptionService, type Ciphertext } from "@/lib/security/field-encryption";

export interface MedicalRecordEnvelope {
  title: Ciphertext;
  content: Ciphertext;
}

/** Binds ciphertext to both record and patient IDs to prevent cross-record ciphertext substitution. */
export class MedicalRecordEncryptionService {
  constructor(private readonly encryption: FieldEncryptionService = new FieldEncryptionService()) {}

  encrypt(input: { recordId: string; patientId: string; title: string; content: string }): MedicalRecordEnvelope {
    return {
      title: this.encryption.encrypt(input.title, this.aad(input.recordId, input.patientId, "title")),
      content: this.encryption.encrypt(input.content, this.aad(input.recordId, input.patientId, "content")),
    };
  }

  decrypt(input: { recordId: string; patientId: string; title: Ciphertext; content: Ciphertext }): { title: string; content: string } {
    return {
      title: this.encryption.decrypt(input.title, this.aad(input.recordId, input.patientId, "title")),
      content: this.encryption.decrypt(input.content, this.aad(input.recordId, input.patientId, "content")),
    };
  }

  private aad(recordId: string, patientId: string, field: "title" | "content"): string {
    return `medical-record:${recordId}:${patientId}:${field}`;
  }
}
