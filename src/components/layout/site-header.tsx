"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, ArrowUpLeft, ArrowUpRight, CalendarDays, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { isArabic, locale, setLocale, tx } = useLocale();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav: { href: Route; label: string }[] = [
    { href: "/search", label: tx("الأطباء", "Doctors") },
    { href: "/search?type=clinics", label: tx("العيادات", "Clinics") },
    { href: "/search?type=diagnostics", label: tx("الأشعة والتحاليل", "Diagnostics") },
  ];
  return <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
    <div className="container-shell flex h-[76px] items-center justify-between gap-4">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={tx("طِبّي - الرئيسية", "Tibbi - Home")}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20"><Activity size={21} strokeWidth={2.6} /></span>
        <span className="leading-tight"><span className="block text-lg font-black tracking-tight text-navy dark:text-white">{tx("طِبّي", "Tibbi")}</span><span className="block text-[10px] font-semibold tracking-wide text-foreground/45">{tx("صحتك أقرب", "Care, closer")}</span></span>
      </Link>
      <nav className="hidden items-center gap-1 lg:flex" aria-label={tx("القائمة الرئيسية", "Main navigation")}>
        {nav.map((item) => <Link key={item.href} href={item.href} className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary hover:text-primary", pathname === item.href.split("?")[0] ? "text-primary" : "text-foreground/70")}>{item.label}</Link>)}
        <div className="group relative">
          <button className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-secondary hover:text-primary">{tx("لوحات التحكم", "Dashboards")}<ChevronDown size={14} /></button>
          <div className="invisible absolute start-0 top-full mt-2 w-52 translate-y-1 rounded-2xl border border-border bg-card p-2 opacity-0 shadow-soft transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <Link href="/dashboard/patient" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">{tx("حساب المريض", "Patient dashboard")}</Link>
            <Link href="/dashboard/doctor" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">{tx("لوحة الطبيب", "Doctor dashboard")}</Link>
            <Link href="/admin" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary">{tx("الإدارة", "Administration")}</Link>
          </div>
        </div>
      </nav>
      <div className="hidden items-center gap-2 sm:flex">
        <Button variant="ghost" size="icon" aria-label={tx("تغيير المظهر", "Toggle theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button variant="ghost" size="sm" className="px-2.5" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={tx("Switch to English", "التبديل إلى العربية")}>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[10px] font-extrabold">{locale === "ar" ? "EN" : "ع"}</span>
        </Button>
        <Button variant="outline" size="sm" asChild><Link href="/dashboard/patient">{tx("دخول", "Sign in")}</Link></Button>
        <Button size="sm" asChild><Link href="/search">{tx("احجز موعداً", "Book now")} {isArabic ? <ArrowUpLeft size={15} /> : <ArrowUpRight size={15} />}</Link></Button>
      </div>
      <div className="flex items-center gap-1 sm:hidden">
        <Button variant="ghost" size="icon" aria-label={tx("تغيير المظهر", "Toggle theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</Button>
        <Button variant="ghost" size="icon" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {mobileOpen && <div className="border-t border-border bg-card px-4 py-4 shadow-soft sm:hidden">
      <nav className="container-shell flex flex-col gap-1">
        {nav.map((item) => <Link key={item.href} onClick={() => setMobileOpen(false)} href={item.href} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-secondary">{item.label}</Link>)}
        <Link onClick={() => setMobileOpen(false)} href="/dashboard/patient" className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-secondary">{tx("مواعيدي", "My appointments")}</Link>
        <div className="mt-2 flex gap-2 border-t border-border pt-3"><Button variant="outline" className="flex-1" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>{tx("English", "العربية")}</Button><Button className="flex-1" asChild><Link href="/search"><CalendarDays size={16} />{tx("احجز موعداً", "Book now")}</Link></Button></div>
      </nav>
    </div>}
  </header>;
}
