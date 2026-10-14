import { DirectoryService } from "@/modules/directory/application/directory.service";
import { PrismaDirectoryRepository } from "@/modules/directory/infrastructure/prisma-directory.repository";
import { FieldEncryptionService } from "@/lib/security/field-encryption";
export const directoryService = new DirectoryService(new PrismaDirectoryRepository(), new FieldEncryptionService());
