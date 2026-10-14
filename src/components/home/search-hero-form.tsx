"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Building2, FlaskConical, MapPin, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/locale-context";
const kinds = [
  { id: "doctors", ar: "أطباء", en: "Doctors", icon: Stethoscope },
  { id: "clinics", ar: "عيادات", en: "Clinics", icon: Building2 },
  { id: "radiology", ar: "أشعة", en: "Radiology", icon: Activity },
  { id: "labs", ar: "تحاليل", en: "Lab tests", icon: FlaskConical },
];
export function SearchHeroForm() {
  const { isArabic, tx } = useLocale();
  const router = useRouter();
  const [kind, setKind] = useState("doctors");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (city) params.set("city", city);
    if (date) params.set("date", date);
    params.set("type", kind);
    router.push(`/search?${params.toString()}`);
  }
  return <form onSubmit={submit} className="relative z-10 rounded-[1.65rem] border border-white/90 bg-white p-3 shadow-float dark:border-border dark:bg-card sm:p-4">
    <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl bg-secondary/70 p-1.5">
      {kinds.map(({ id, ar, en, icon: Icon }) => <button type="button" onClick={() => setKind(id)} key={id} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition sm:px-4 ${kind === id ? "bg-white text-primary shadow-sm dark:bg-slate-800" : "text-foreground/55 hover:text-foreground"}`}><Icon size={15} />{isArabic ? ar : en}</button>)}
    </div>
    <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
      <label className="relative block"><span className="sr-only">{tx("التخصص أو اسم الطبيب", "Specialty or doctor")}</span><Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-primary ${isArabic ? "right-4" : "left-4"}`} /><Input className={isArabic ? "border-transparent bg-background pe-11 focus:border-primary" : "border-transparent bg-background ps-11 focus:border-primary"} placeholder={tx("التخصص أو اسم الطبيب", "Specialty or doctor")} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="relative block"><span className="sr-only">{tx("المدينة", "City")}</span><MapPin className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-primary ${isArabic ? "right-4" : "left-4"}`} /><Input className={isArabic ? "border-transparent bg-background pe-11 focus:border-primary" : "border-transparent bg-background ps-11 focus:border-primary"} placeholder={tx("المدينة", "City")} value={city} onChange={(e) => setCity(e.target.value)} list="algerian-cities" /><datalist id="algerian-cities"><option value={tx("باتنة", "Batna")} /><option value={tx("قسنطينة", "Constantine")} /><option value={tx("سطيف", "Setif")} /><option value={tx("الجزائر", "Algiers")} /></datalist></label>
      <label className="relative block"><span className="sr-only">{tx("تاريخ الموعد", "Appointment date")}</span><input type="date" className="h-12 w-full rounded-xl border border-transparent bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl md:w-auto"><Search size={17} /><span className="md:hidden">{tx("ابحث الآن", "Search")}</span><span className="hidden md:inline">{tx("ابحث", "Search")}</span></Button>
    </div>
    <p className="mt-3 px-1 text-[11px] text-foreground/45">{tx("نتائج موثوقة · مواعيد محدثة · حجز آمن", "Verified providers · Live availability · Secure booking")}</p>
  </form>;
}
