import { AuthService } from "@/modules/identity/application/auth.service";
import { PrismaAuthRepository } from "@/modules/identity/infrastructure/prisma-auth.repository";
import { ConfiguredOtpDelivery } from "@/lib/security/otp-delivery";
import { JwtTokenService } from "@/lib/security/jwt";
import { FieldEncryptionService } from "@/lib/security/field-encryption";

const repository = new PrismaAuthRepository();
const delivery = new ConfiguredOtpDelivery();
const jwt = new JwtTokenService();
const encryption = new FieldEncryptionService();
export const authService = new AuthService(repository, delivery, jwt, encryption);
