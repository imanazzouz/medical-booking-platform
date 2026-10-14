import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_ORIGIN ?? "https://tibbi.example";
const isIndexableProduction = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false" && process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: "طِبّي | احجز موعدك الطبي بسهولة", template: "%s | طِبّي" },
  description: "اعثر على الطبيب المناسب واحجز موعدك في العيادات ومراكز الأشعة والتحاليل بسهولة وأمان.",
  applicationName: "Tibbi",
  openGraph: {
    type: "website",
    siteName: "طِبّي | Tibbi",
    title: "طِبّي | احجز موعدك الطبي بسهولة",
    description: "اعثر على الطبيب المناسب واحجز موعدك الطبي بسهولة وأمان.",
    locale: "ar_DZ",
  },
  twitter: { card: "summary" },
  robots: isIndexableProduction ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#087f80" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl" suppressHydrationWarning><body><AppProviders>{children}</AppProviders></body></html>;
}
