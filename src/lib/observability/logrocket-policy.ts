export const LOGROCKET_CONSENT_KEY = "tibbi.analytics-consent";
export const LOGROCKET_ENTRY_ROUTES = new Set(["/", "/about", "/privacy", "/terms"]);
export type LogRocketConsent = "unknown" | "granted" | "denied";

export function canStartLogRocket(input: {
  approved: boolean;
  appId: string | undefined;
  consent: LogRocketConsent;
  pathname: string;
}): boolean {
  return input.approved
    && Boolean(input.appId?.trim())
    && input.consent === "granted"
    && LOGROCKET_ENTRY_ROUTES.has(input.pathname);
}

/** Strip query, fragments, and private route names; reject any off-origin top-level URL. */
export function sanitizeLogRocketUrl(rawUrl: string, currentOrigin: string): string | null {
  try {
    const origin = new URL(currentOrigin).origin;
    const parsed = new URL(rawUrl, origin);
    if (parsed.origin !== origin) return null;
    const path = LOGROCKET_ENTRY_ROUTES.has(parsed.pathname) ? parsed.pathname : "/[restricted]";
    return `${origin}${path}`;
  } catch {
    return null;
  }
}
