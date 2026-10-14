import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export function SiteLayout({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return <><SiteHeader /><main>{children}</main>{footer && <SiteFooter />}</>;
}
