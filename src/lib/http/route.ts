import { NextRequest } from "next/server";
import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/http/errors";
import { failure } from "@/lib/http/response";
import { logger } from "@/lib/observability/logger";
import { getPrincipal, type Principal } from "@/lib/http/auth-guard";
import { getEnv } from "@/lib/env";
import { randomUUID } from "node:crypto";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordSensitiveApiEvent } from "@/modules/security/infrastructure/security-audit";

export interface RouteOptions { auth?: boolean; roles?: Array<"USER" | "PATIENT" | "DOCTOR" | "ADMIN">; scopes?: string[] }
export type ApiHandler = (request: NextRequest, principal: Principal | null) => Promise<Response>;

export function withApi(handler: ApiHandler, options: RouteOptions = {}) {
  return async (request: NextRequest): Promise<Response> => {
    const suppliedRequestId = request.headers.get("x-request-id") ?? "";
    const requestId = /^[A-Za-z0-9_-]{1,100}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
    const startedAt = Date.now();
    let principal: Principal | null = null;
    let auditRecorded = false;
    try {
      if (options.auth || options.roles?.length || request.headers.has("authorization")) principal = await getPrincipal(request);
      if (options.auth && !principal) throw new UnauthorizedError();
      if (options.roles?.length && !options.roles.some((role) => principal?.roles.includes(role))) throw new ForbiddenError();
      if (principal?.authSource === "api-key") {
        if (!options.scopes?.length || !options.scopes.some((scope) => principal?.scopes?.includes(scope))) throw new ForbiddenError("مفتاح API لا يملك النطاق المطلوب");
        await enforceRateLimit("api-key", principal.apiKeyId ?? principal.id, 600, 60);
      }
      const usesCookieAuth = principal?.authSource === "cookie" || request.cookies.has("access_token") || request.cookies.has("refresh_token");
      if (usesCookieAuth && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const origin = request.headers.get("origin");
        let originMatches = false;
        try { originMatches = Boolean(origin && new URL(origin).origin === new URL(getEnv().APP_ORIGIN).origin); } catch { originMatches = false; }
        if (!originMatches) throw new ForbiddenError("مصدر الطلب غير مسموح");
        if (!verifyCsrfToken(request.cookies.get("csrf_token")?.value, request.headers.get("x-csrf-token"))) throw new ForbiddenError("رمز حماية الطلب غير صالح أو مفقود");
      }
      const response = await handler(request, principal);
      await recordSensitiveApiEvent({ userId: principal?.id ?? null, requestId, method: request.method, pathname: request.nextUrl.pathname, status: response.status, authSource: principal?.authSource });
      auditRecorded = true;
      response.headers.set("x-request-id", requestId);
      logger.info({ requestId, method: request.method, path: request.nextUrl.pathname, status: response.status, durationMs: Date.now() - startedAt, userId: principal?.id }, "request completed");
      return response;
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      const prismaCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
      const mapped = !appError && prismaCode === "P2002" ? { code: "CONFLICT", message: "المورد موجود مسبقاً", status: 409 } :
        !appError && prismaCode === "P2025" ? { code: "NOT_FOUND", message: "المورد غير موجود", status: 404 } : null;
      const status = appError?.statusCode ?? mapped?.status ?? 500;
      const message = appError ? (appError.expose ? appError.message : "حدث خطأ داخلي") : mapped?.message ?? "حدث خطأ داخلي";
      if (!auditRecorded) await recordSensitiveApiEvent({ userId: principal?.id ?? null, requestId, method: request.method, pathname: request.nextUrl.pathname, status, authSource: principal?.authSource });
      logger.error({ requestId, method: request.method, path: request.nextUrl.pathname, status, errorName: error instanceof Error ? error.name : "UnknownError", code: appError?.code ?? prismaCode }, "request failed");
      const response = failure(appError?.code ?? mapped?.code ?? "INTERNAL_ERROR", message, status, requestId, appError?.expose ? appError.details : undefined);
      response.headers.set("x-request-id", requestId);
      if (status === 429 && appError?.details && typeof appError.details === "object" && "retryAfterSeconds" in appError.details) response.headers.set("retry-after", String((appError.details as { retryAfterSeconds: number }).retryAfterSeconds));
      return response;
    }
  };
}
