import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import type { OtpChannel } from "@prisma/client";

export interface OtpDelivery { send(channel: OtpChannel, destination: string, code: string): Promise<void> }

/** External delivery adapter. Never logs or persists the clear OTP. */
export class ConfiguredOtpDelivery implements OtpDelivery {
  private transporter: Transporter | undefined;
  async send(channel: OtpChannel, destination: string, code: string): Promise<void> {
    const env = getEnv();
    if (channel === "EMAIL") {
      this.transporter ??= nodemailer.createTransport({
        host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, pool: true, maxConnections: 3, maxMessages: 100,
        connectionTimeout: 8_000, greetingTimeout: 5_000, socketTimeout: 10_000,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
      await this.transporter.sendMail({ from: env.SMTP_FROM, to: destination, subject: "رمز التحقق", text: `رمز التحقق الخاص بك: ${code}. تنتهي صلاحيته خلال 5 دقائق.` });
      return;
    }
    const response = await fetch(env.SMS_GATEWAY_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${env.SMS_GATEWAY_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ to: destination, message: `رمز التحقق: ${code}. صالح لمدة 5 دقائق.` }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`SMS gateway rejected request (${response.status})`);
  }
}
