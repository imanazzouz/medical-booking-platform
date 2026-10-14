export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly expose = true,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) { super("VALIDATION_ERROR", "بيانات الطلب غير صالحة", 400, true, details); }
}
export class UnauthorizedError extends AppError {
  constructor(message = "يجب تسجيل الدخول للمتابعة") { super("UNAUTHORIZED", message, 401); }
}
export class ForbiddenError extends AppError {
  constructor(message = "ليست لديك صلاحية لهذا الإجراء") { super("FORBIDDEN", message, 403); }
}
export class NotFoundError extends AppError {
  constructor(message = "المورد غير موجود") { super("NOT_FOUND", message, 404); }
}
export class ConflictError extends AppError {
  constructor(message = "تعذر تنفيذ العملية بسبب تعارض") { super("CONFLICT", message, 409); }
}
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) { super("RATE_LIMITED", "محاولات كثيرة. حاول لاحقاً", 429, true, { retryAfterSeconds }); }
}
export class ServiceUnavailableError extends AppError {
  constructor() { super("SERVICE_UNAVAILABLE", "الخدمة غير متاحة مؤقتاً", 503); }
}
