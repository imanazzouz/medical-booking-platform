import pino from "pino";

// Deliberately redact common secrets and payloads. Route handlers should log IDs/status only,
// never request bodies, OTPs, JWTs, medical notes, or payment data.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "otp", "token", "medicalRecord", "body"],
    censor: "[REDACTED]",
  },
  base: { service: "medical-booking-api" },
});
