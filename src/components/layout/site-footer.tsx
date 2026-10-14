"use client";
import Link from "next/link";
import { Activity, MapPin, Phone } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

export function SiteFooter() {
  const { tx } = useLocale();
  return <footer className="mt-20 border-t border-border bg-card">
    <div className="container-shell grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:py-16">
      <div><Link href="/" className="mb-4 flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white"><Activity size={21} /></span><span className="text-xl font-black">{tx("طِبّي", "Tibbi")}</span></Link><p className="max-w-xs text-sm leading-7 text-foreground/60">{tx("نجعل الرعاية الصحية أسهل وأقرب إليك، من أول بحث حتى موعدك القادم.", "Making quality healthcare easier to find and closer to home.")}</p><div className="mt-5 flex gap-2"><a className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white" href="#instagram" aria-label="Instagram"><span className="text-xs font-black">ig</span></a><a className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white" href="#facebook" aria-label="Facebook"><span className="text-sm font-black">f</span></a><a className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white" href="#linkedin" aria-label="LinkedIn"><span className="text-[10px] font-black">in</span></a></div></div>
      <div><h3 className="mb-4 font-extrabold">{tx("اكتشف", "Discover")}</h3><div className="flex flex-col gap-3 text-sm text-foreground/60"><Link href="/search">{tx("ابحث عن طبيب", "Find a doctor")}</Link><Link href="/search?type=clinics">{tx("العيادات", "Clinics")}</Link><Link href="/search?type=diagnostics">{tx("الأشعة والتحاليل", "Radiology & labs")}</Link></div></div>
      <div><h3 className="mb-4 font-extrabold">{tx("للممارسين", "For providers")}</h3><div className="flex flex-col gap-3 text-sm text-foreground/60"><Link href="/dashboard/doctor">{tx("بوابة الأطباء", "Doctor portal")}</Link><Link href="/admin">{tx("إدارة المنشأة", "Manage a practice")}</Link><Link href="/about">{tx("كيف يعمل طِبّي؟", "How Tibbi works")}</Link></div></div>
      <div><h3 className="mb-4 font-extrabold">{tx("نحن هنا للمساعدة", "We’re here to help")}</h3><div className="flex flex-col gap-3 text-sm text-foreground/60"><span className="flex items-center gap-2"><Phone size={15} /> 0550 12 34 56</span><span className="flex items-center gap-2"><MapPin size={15} />{tx("باتنة، الجزائر", "Batna, Algeria")}</span><a href="mailto:hello@tibbi.dz">hello@tibbi.dz</a></div></div>
    </div>
    <div className="border-t border-border"><div className="container-shell flex flex-col gap-3 py-5 text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Tibbi. {tx("جميع الحقوق محفوظة.", "All rights reserved.")}</span><div className="flex gap-5"><Link href="/privacy">{tx("الخصوصية", "Privacy")}</Link><Link href="/terms">{tx("الشروط والأحكام", "Terms")}</Link></div></div></div>
  </footer>;
}
