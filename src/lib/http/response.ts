import { NextResponse } from "next/server";

/** Stable wire-level response DTOs shared by every API route. */
export interface ApiSuccessDto<T> { data: T }
export interface ApiErrorDto { error: { code: string; message: string; details?: unknown; requestId: string } }

export function success<T>(data: T, status = 200, headers?: HeadersInit): NextResponse<ApiSuccessDto<T>> {
  return NextResponse.json({ data }, { status, headers });
}
export function failure(code: string, message: string, status: number, requestId: string, details?: unknown): NextResponse<ApiErrorDto> {
  return NextResponse.json({ error: { code, message, ...(details === undefined ? {} : { details }), requestId } }, { status, headers: { "cache-control": "no-store" } });
}
