"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
export type Locale = "ar" | "en";
interface LocaleContextValue { locale: Locale; isArabic: boolean; setLocale: (locale: Locale) => void; tx: (arabic: string, english: string) => string }
const LocaleContext = createContext<LocaleContextValue | null>(null);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  useEffect(() => {
    const saved = window.localStorage.getItem("tibbi-locale");
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("tibbi-locale", locale);
  }, [locale]);
  const value = useMemo(() => ({ locale, isArabic: locale === "ar", setLocale: setLocaleState, tx: (ar: string, en: string) => locale === "ar" ? ar : en }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
