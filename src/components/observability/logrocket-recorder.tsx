"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-context";
import { canStartLogRocket, LOGROCKET_CONSENT_KEY, LOGROCKET_ENTRY_ROUTES, sanitizeLogRocketUrl, type LogRocketConsent } from "@/lib/observability/logrocket-policy";

let initialization: Promise<void> | undefined;

function readConsent(): LogRocketConsent {
  try {
    const value = window.localStorage.getItem(LOGROCKET_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  } catch {
    // If consent state cannot be read, fail closed and do not initialize session replay.
    return "denied";
  }
}

/**
 * Opt-in only. Requires an approved vendor agreement, an explicit build flag, and user consent.
 * The capture session can continue across client-side route changes, so consent text explains this.
 */
export function LogRocketRecorder() {
  const pathname = usePathname();
  const { isArabic } = useLocale();
  const [consent, setConsent] = useState<LogRocketConsent>("unknown");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const approved = process.env.NEXT_PUBLIC_LOGROCKET_BAA_APPROVED === "true";
  const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;
  const configured = approved && Boolean(appId);
  const isEntryRoute = LOGROCKET_ENTRY_ROUTES.has(pathname);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  useEffect(() => {
    if (!canStartLogRocket({ approved, appId, consent, pathname }) || initialization) return;

    initialization = import("logrocket").then(({ default: LogRocket }) => {
      if (!canStartLogRocket({ approved, appId, consent: readConsent(), pathname: window.location.pathname })) {
        initialization = undefined;
        return;
      }
      LogRocket.init(appId!, {
        shouldCaptureIP: false,
        shouldDebugLog: false,
        console: { isEnabled: false },
        network: { isEnabled: false },
        dom: {
          inputSanitizer: true,
          textSanitizer: true,
          imageSanitizer: true,
          disablePageTitles: true,
          redactSelectors: ["[data-private]", "[data-sensitive]"],
        },
        browser: {
          urlSanitizer: (rawUrl) => sanitizeLogRocketUrl(rawUrl, window.location.origin),
        },
      });
    }).catch(() => {
      // Monitoring must never break the patient-facing application.
      initialization = undefined;
    });
  }, [appId, approved, consent, pathname]);

  if (!configured) return null;

  const saveConsent = (choice: Exclude<LogRocketConsent, "unknown">) => {
    const previous = consent;
    try {
      window.localStorage.setItem(LOGROCKET_CONSENT_KEY, choice);
    } catch {
      // A granted choice must be persistable before the SDK is allowed to start.
      setConsent("denied");
      setSettingsOpen(false);
      return;
    }
    setConsent(choice);
    setSettingsOpen(false);
    if (previous === "granted" && choice === "denied") {
      // The web SDK has no documented stop API; a full reload prevents further capture.
      window.location.reload();
    }
  };

  const showConsentPanel = settingsOpen || (consent === "unknown" && isEntryRoute);
  const text = isArabic
    ? "تسجيل الجلسة اختياري. عند الموافقة، قد يستمر التسجيل أثناء التنقل داخل التطبيق. نحجب النصوص والحقول والصور، ولا نسجل الشبكة أو console أو عنوان IP، وننقح عناوين الصفحات. يبدأ التسجيل بعد الموافقة عند زيارة صفحة عامة مسموح بها. يمكنك سحب الموافقة من إعدادات الخصوصية؛ يعاد تحميل الصفحة لإيقاف التسجيل في المشاهدات التالية، ولا تُمحى التسجيلات السابقة من حساب المزوّد."
    : "Session recording is optional. If you consent, recording may continue as you navigate within the app. Text, inputs, and images are masked; network and console capture and IP collection are disabled; page URLs are sanitized. Recording starts after consent on an approved public entry page. You can withdraw consent in Privacy settings; the page reloads to stop capture on subsequent views. Previously recorded sessions remain subject to the vendor's retention controls.";

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-[min(28rem,calc(100vw-2rem))]" dir={isArabic ? "rtl" : "ltr"}>
      {showConsentPanel ? (
        <section aria-label={isArabic ? "إعدادات تسجيل الجلسات" : "Session recording settings"} aria-live="polite" className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-soft">
          <h2 className="font-bold">{isArabic ? "خيارات الخصوصية والتسجيل" : "Privacy and recording choices"}</h2>
          <p className="mt-2 leading-6">{text}</p>
          <a className="mt-2 inline-block underline" href="/privacy">{isArabic ? "اقرأ سياسة الخصوصية" : "Read the privacy policy"}</a>
          <div className="mt-3 flex flex-wrap gap-2">
            {consent !== "granted" && (
              <button className="rounded-xl bg-primary px-3 py-2 font-semibold text-primary-foreground" onClick={() => saveConsent("granted")} type="button">
                {isArabic ? "السماح بتسجيل الجلسة" : "Allow session recording"}
              </button>
            )}
            {consent !== "denied" && (
              <button className="rounded-xl border border-border px-3 py-2 font-semibold" onClick={() => saveConsent("denied")} type="button">
                {consent === "granted" ? (isArabic ? "سحب الموافقة" : "Withdraw consent") : (isArabic ? "لا أسمح" : "Decline")}
              </button>
            )}
            {consent !== "unknown" && (
              <button className="rounded-xl border border-border px-3 py-2" onClick={() => setSettingsOpen(false)} type="button">
                {isArabic ? "إغلاق" : "Close"}
              </button>
            )}
          </div>
        </section>
      ) : (
        consent !== "unknown" && (
          <button aria-expanded={false} className="rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground shadow-soft" onClick={() => setSettingsOpen(true)} type="button">
            {isArabic ? "إعدادات الخصوصية" : "Privacy settings"}
          </button>
        )
      )}
    </div>
  );
}
