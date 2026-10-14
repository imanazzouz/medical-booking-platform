"use client";

/** Obtain a same-origin synchronizer token before cookie-authenticated mutations. */
export async function csrfRequestHeader(): Promise<Record<string, string>> {
  const response = await fetch("/api/v1/auth/csrf", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const result = await response.json();
  if (!response.ok || typeof result.data?.token !== "string") throw new Error("تعذر تهيئة حماية الطلب؛ أعد تحميل الصفحة");
  return { "x-csrf-token": result.data.token };
}
