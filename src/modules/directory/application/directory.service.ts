import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/http/errors";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
import { identifierHash } from "@/lib/security/otp";
import type { Principal } from "@/lib/http/auth-guard";
import type { DirectoryRepository } from "@/modules/directory/application/directory.ports";
import type { OrganizationCreateDto, SearchDto } from "@/modules/directory/application/directory.dto";

export class DirectoryService {
  constructor(private readonly repository: DirectoryRepository, private readonly encryption: FieldEncryptionService, private readonly now: () => Date = () => new Date()) {}

  search(input: SearchDto) { return this.repository.searchProviders(input); }
  async getOrganization(id: string) {
    const item = await this.repository.getOrganization(id);
    if (!item) throw new NotFoundError("الجهة الطبية غير موجودة");
    return item;
  }
  async createOrganization(input: OrganizationCreateDto, principal: Principal) {
    if (!principal.roles.includes("ADMIN")) throw new ForbiddenError("إنشاء جهة طبية يتطلب صلاحية إدارية");
    return this.repository.createOrganization(input);
  }
  async updateOrganization(id: string, data: Record<string, unknown>, principal: Principal) {
    await this.assertCanManage(principal, id);
    if ("status" in data && !principal.roles.includes("ADMIN")) throw new ForbiddenError("تغيير حالة اعتماد الجهة يتطلب صلاحية إدارية");
    try { return await this.repository.updateOrganization(id, data); }
    catch (error) { if (isUniqueConflict(error)) throw new ConflictError("المعرف أو الرابط مستخدم مسبقاً"); throw error; }
  }
  async deleteOrganization(id: string, principal: Principal): Promise<void> {
    await this.assertCanManage(principal, id);
    if (!await this.repository.softDeleteOrganization(id, this.now())) throw new NotFoundError("الجهة الطبية غير موجودة");
  }
  async listDoctors(input: { specialty?: string; page: number; pageSize: number }) { return this.repository.listDoctors(input); }
  async getDoctor(id: string) {
    const doctor = await this.repository.getDoctor(id);
    if (!doctor) throw new NotFoundError("الطبيب غير موجود");
    return doctor;
  }
  async createDoctor(input: { userId: string; publicSlug: string; publicBiography?: string; yearsOfExperience?: number; licenseNumber: string }, principal: Principal) {
    if (!principal.roles.includes("ADMIN")) throw new ForbiddenError("إنشاء ملف طبيب يتطلب صلاحية إدارية");
    const license = this.encryption.encrypt(input.licenseNumber, `doctor:${input.userId}:license`);
    try {
      return await this.repository.createDoctor({
        userId: input.userId, publicSlug: input.publicSlug, publicBiography: input.publicBiography, yearsOfExperience: input.yearsOfExperience,
        license: { ciphertext: license.ciphertext, nonce: license.nonce, authTag: license.authTag, lookupHash: identifierHash(input.licenseNumber), keyVersion: license.keyVersion },
      });
    } catch (error) { if (isUniqueConflict(error)) throw new ConflictError("المستخدم أو الرابط أو رقم الترخيص مرتبط بحساب آخر"); throw error; }
  }
  async updateDoctor(id: string, data: Record<string, unknown>, principal: Principal) {
    if (!principal.roles.includes("ADMIN")) {
      const ownId = await this.repository.doctorIdForUser(principal.id);
      if (ownId !== id) throw new ForbiddenError();
      if ("verificationStatus" in data) throw new ForbiddenError("لا يمكن للطبيب تغيير حالة الاعتماد بنفسه");
    }
    try { return await this.repository.updateDoctor(id, data); }
    catch (error) { if (isUniqueConflict(error)) throw new ConflictError("الرابط مستخدم مسبقاً"); throw error; }
  }
  async deleteDoctor(id: string, principal: Principal): Promise<void> {
    if (!principal.roles.includes("ADMIN")) throw new ForbiddenError("حذف ملف طبيب يتطلب صلاحية إدارية");
    if (!await this.repository.softDeleteDoctor(id, this.now())) throw new NotFoundError("الطبيب غير موجود");
  }
  private async assertCanManage(principal: Principal, organizationId: string) {
    if (principal.roles.includes("ADMIN")) return;
    if (!await this.repository.canManageOrganization(principal.id, organizationId)) throw new ForbiddenError();
  }
}
function isUniqueConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002"; }
