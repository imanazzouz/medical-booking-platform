import { ApiKeyService } from "@/modules/identity/application/api-key.service";
import { PrismaApiKeyRepository } from "@/modules/identity/infrastructure/prisma-api-key.repository";

export const apiKeyService = new ApiKeyService(new PrismaApiKeyRepository());
