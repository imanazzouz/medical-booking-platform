"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";
import { LogRocketRecorder } from "@/components/observability/logrocket-recorder";

function AppToaster() {
  const { isArabic } = useLocale();
  return <Toaster position={isArabic ? "top-left" : "top-right"} dir={isArabic ? "rtl" : "ltr"} richColors closeButton theme="system" toastOptions={{ className: "!rounded-2xl !font-sans" }} />;
}
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } }));
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={client}>
      <LocaleProvider>{children}<AppToaster /><LogRocketRecorder /></LocaleProvider>
    </QueryClientProvider>
  </ThemeProvider>;
}
