import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128).regex(/[A-Z]/, "يجب أن تحتوي كلمة المرور على حرف كبير").regex(/[a-z]/).regex(/[0-9]/),
});
export const verifyOtpSchema = z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/), phone: z.string().trim().min(7).max(24).optional() });
export const loginSchema = z.object({ email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()), password: z.string().min(1).max(128), accountType: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).default("PATIENT") });
export const phoneOtpSchema = z.object({ phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/) });
export type RegisterDto = z.infer<typeof registerSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthenticatedUserResponseDto { id: string; name: string | null; email: string | null; accountType: "PATIENT" | "DOCTOR" | "ADMIN" }
export interface AuthLoginResponseDto { user: AuthenticatedUserResponseDto; accessExpiresIn: number }
