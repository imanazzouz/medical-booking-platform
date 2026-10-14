
import nodemailer, { type Transporter } from "nodemailer";
import webpush from "web-push";
import { getEnv } from "@/lib/env";
import type { NotificationTransport } from "@/modules/notifications/application/notification-worker.ports";

export class ConfiguredNotificationTransport implements NotificationTransport {
  private readonly transporter: Transporter;

  constructor() {
    const env = getEnv();

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 8_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const env = getEnv();

    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
    });
  }

  async sendSms(to: string, text: string): Promise<void> {
    const env = getEnv();

    // SMS is disabled until a real provider is configured.
    if (!env.SMS_GATEWAY_URL || !env.SMS_GATEWAY_TOKEN) {
      throw new Error("SMS delivery is not configured");
    }

    const response = await fetch(env.SMS_GATEWAY_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.SMS_GATEWAY_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        to,
        message: text,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`SMS provider failure (${response.status})`);
    }
  }

  async sendPush(
    subscription: {
      endpoint: string;
      expirationTime: number | null;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    payload: string,
  ): Promise<void> {
    const env = getEnv();

    if (
      !env.VAPID_PUBLIC_KEY ||
      !env.VAPID_PRIVATE_KEY ||
      !env.VAPID_SUBJECT
    ) {
      throw new Error("Web Push is not configured");
    }

    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );

    await webpush.sendNotification(subscription, payload, {
      TTL: 60,
      urgency: "high",
    });
  }
}
