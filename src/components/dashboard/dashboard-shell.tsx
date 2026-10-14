"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import type { Route } from "next";
import { Activity, Bell, CalendarDays, ChevronDown, CircleHelp, FileHeart, LayoutDashboard, Settings, ShieldCheck, Stethoscope, Users, WalletCards } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
type DashboardNavItem = { href: Route; ar: string; en: string; icon: typeof LayoutDashboard; count?: string };
const patientNav: DashboardNavItem[] = [
  { href: "/dashboard/patient", ar: "نظرة عامة", en: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/patient#appointments", ar: "مواعيدي", en: "My appointments", icon: CalendarDays, count: "2" },
  { href: "/dashboard/patient#records", ar: "سجلاتي الطبية", en: "My health records", icon: FileHeart },
  { href: "/dashboard/patient#notifications", ar: "الإشعارات", en: "Notifications", icon: Bell, count: "3" },
];
const doctorNav: DashboardNavItem[] = [
  { href: "/dashboard/doctor", ar: "نظرة عامة", en: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/doctor#schedule", ar: "جدولي", en: "My schedule", icon: CalendarDays },
  { href: "/dashboard/doctor#patients", ar: "مرضاي", en: "My patients", icon: Users },
  { href: "/dashboard/doctor#earnings", ar: "الإيرادات", en: "Earnings", icon: WalletCards },
  { href: "/dashboard/doctor#settings", ar: "إعدادات الحساب", en: "Account settings", icon: Settings },
];
const adminNav: DashboardNavItem[] = [
  { href: "/admin", ar: "لوحة التحكم", en: "Overview", icon: LayoutDashboard },
  { href: "/admin#providers", ar: "الجهات الطبية", en: "Providers", icon: Stethoscope },
  { href: "/admin#users", ar: "المستخدمون", en: "Users", icon: Users },
  { href: "/admin#reports", ar: "التقارير", en: "Reports", icon: WalletCards },
  { href: "/admin#settings", ar: "الإعدادات", en: "Settings", icon: Settings },
];
export function DashboardShell({ children, type }: { children: ReactNode; type: "patient" | "doctor" | "admin" }) {
  const { isArabic, tx } = useLocale();
  const pathname = usePathname();
  const nav = type === "patient" ? patientNav : type === "doctor" ? doctorNav : adminNav;
  const title = type === "patient" ? tx("حساب المريض", "Patient portal") : type === "doctor" ? tx("بوابة الطبيب", "Doctor portal") : tx("لوحة الإدارة", "Admin console");
  const personName = type === "patient" ? tx("مريم بن صالح", "Maryam Ben Salah") : type === "doctor" ? tx("د. لينا منصور", "Dr. Lina Mansour") : tx("مدير النظام", "System Admin");
  return <><SiteHeader /><div className="min-h-[75vh] bg-background"><div className="container-shell grid gap-6 py-6 lg:grid-cols-[245px_1fr] lg:py-8">
    <aside className="hidden lg:block"><div className="sticky top-24 rounded-3xl border border-border bg-card p-4"><div className="mb-5 flex items-center gap-3 border-b border-border px-2 pb-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-primary">{type === "patient" ? <Activity size={20}/> : type === "doctor" ? <Stethoscope size={20}/> : <ShieldCheck size={20}/>}</span><div><b className="block text-sm">{title}</b><span className="mt-1 block text-[10px] text-foreground/45">{tx("مرحباً بعودتك", "Welcome back")}</span></div></div><nav className="space-y-1">{nav.map((item)=>{const Icon=item.icon;const active=pathname===item.href.split("#")[0]&&item.href===nav[0].href;return <Link href={item.href} key={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition",active?"bg-primary text-white shadow-sm":"text-foreground/60 hover:bg-secondary hover:text-primary")}><Icon size={17}/><span className="flex-1">{isArabic?item.ar:item.en}</span>{item.count&&<span className={cn("rounded-full px-2 py-0.5 text-[10px]",active?"bg-white/20":"bg-secondary text-primary")}>{item.count}</span>}</Link>;})}</nav><div className="mt-5 rounded-2xl bg-gradient-to-bl from-secondary to-background p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary shadow-sm dark:bg-slate-800"><CircleHelp size={17}/></span><b className="mt-3 block text-xs">{tx("هل تحتاج مساعدة؟","Need a hand?")}</b><p className="mt-1 text-[10px] leading-5 text-foreground/50">{tx("فريق الدعم متاح لمساعدتك.","Our support team is here for you.")}</p><Button variant="outline" size="sm" className="mt-3 h-8 w-full text-[10px]">{tx("تواصل معنا","Contact support")}</Button></div></div></aside>
    <main className="min-w-0"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-foreground/45">{tx("مساحة العمل", "Workspace")} / {title}</p><h1 className="mt-1 text-2xl font-black">{tx("مرحباً، ", "Welcome, ")}{personName.split(" ").slice(0,type==="patient"?1:2).join(" ")} 👋</h1></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label={tx("الإشعارات","Notifications")}><Bell size={17}/></Button><button className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-black text-primary">{type==="patient"?"م":type==="doctor"?"ل":"A"}</span><span className="hidden text-xs font-bold sm:block">{personName}</span><ChevronDown size={14} className="text-foreground/45"/></button></div></div>
      <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">{nav.map((item)=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold"><Icon size={15} className="text-primary"/>{isArabic?item.ar:item.en}</Link>;})}</div>{children}</main>
  </div></div><SiteFooter /></>;
}
