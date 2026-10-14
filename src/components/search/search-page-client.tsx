"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownUp, ArrowLeft, ArrowRight, ChevronDown, Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/layout/site-layout";
import { DoctorCard } from "@/components/directory/doctor-card";
import { ProviderCard } from "@/components/directory/provider-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { providers } from "@/features/directory/data";
import { useDoctors } from "@/features/directory/hooks";
import { useLocale } from "@/lib/i18n/locale-context";
import { toast } from "sonner";

const specialtyOptions = ["طب القلب", "طب الأطفال", "الأمراض الجلدية", "طب العيون", "أمراض النساء", "جراحة العظام"];
export function SearchPageClient({ initialQuery = "", initialCity = "", initialSpecialty = "", initialType = "doctors" }: { initialQuery?: string; initialCity?: string; initialSpecialty?: string; initialType?: string }) {
  const { isArabic, tx } = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState("rating");
  const [availableToday, setAvailableToday] = useState(false);
  const [priceMax, setPriceMax] = useState(5000);
  const [mobileFilters, setMobileFilters] = useState(false);
  const results = useDoctors({ query, city, specialty, sort, priceMax });
  const shownProviders = useMemo(() => providers.filter((p) => !city || p.cityAr.includes(city) || p.cityEn.toLowerCase().includes(city.toLowerCase())), [city]);
  const doctorResults = (results.data ?? []).filter((doctor) => !availableToday || doctor.availableToday);
  const hasProviders = type !== "doctors" && type !== "";
  const count = hasProviders ? shownProviders.length : doctorResults.length;
  const arrow = isArabic ? <ArrowLeft size={15} /> : <ArrowRight size={15} />;

  const clear = () => { setQuery(""); setCity(""); setSpecialty(""); setAvailableToday(false); setPriceMax(5000); };
  const filters = <div className="space-y-6">
    <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">{tx("التخصص", "Specialty")}</h3>{specialty && <button onClick={() => setSpecialty("")} className="text-xs font-bold text-primary">{tx("مسح", "Clear")}</button>}</div><div className="space-y-2">{specialtyOptions.map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/70"><input type="radio" name="specialty" checked={specialty === option} onChange={() => setSpecialty(specialty === option ? "" : option)} className="h-4 w-4 accent-primary" />{tx(option, option === "طب القلب" ? "Cardiology" : option === "طب الأطفال" ? "Pediatrics" : option === "الأمراض الجلدية" ? "Dermatology" : option === "طب العيون" ? "Ophthalmology" : option === "أمراض النساء" ? "Gynecology" : "Orthopedics")}</label>)}</div></div>
    <div className="border-t border-border pt-5"><h3 className="mb-3 text-sm font-extrabold">{tx("الموقع", "Location")}</h3><div className="relative"><MapPin className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-primary ${isArabic ? "right-3" : "left-3"}`} /><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tx("المدينة أو المنطقة", "City or area")} className={isArabic ? "h-10 pe-9" : "h-10 ps-9"} /></div><div className="mt-3 flex flex-wrap gap-2">{[tx("باتنة", "Batna"), tx("قسنطينة", "Constantine"), tx("سطيف", "Setif")].map((value) => <button onClick={() => setCity(city === value ? "" : value)} key={value} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${city === value ? "bg-primary text-white" : "bg-secondary text-foreground/65 hover:text-primary"}`}>{value}</button>)}</div></div>
    <div className="border-t border-border pt-5"><h3 className="mb-3 text-sm font-extrabold">{tx("التوفر", "Availability")}</h3><label className="flex cursor-pointer items-center gap-3 text-sm text-foreground/70"><input type="checkbox" checked={availableToday} onChange={(e) => setAvailableToday(e.target.checked)} className="h-4 w-4 rounded accent-primary" />{tx("متاح اليوم", "Available today")}</label></div>
    <div className="border-t border-border pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">{tx("السعر الأقصى", "Maximum price")}</h3><span className="text-xs font-bold text-primary">{priceMax.toLocaleString()} {tx("دج", "DZD")}</span></div><input type="range" min="1000" max="8000" step="500" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-primary" /><div className="mt-1 flex justify-between text-[10px] text-foreground/45"><span>1,000 {tx("دج", "DZD")}</span><span>8,000 {tx("دج", "DZD")}</span></div></div>
  </div>;

  return <SiteLayout>
    <section className="border-b border-border bg-gradient-to-bl from-mint/60 via-background to-background py-8 sm:py-10">
      <div className="container-shell"><div className="mb-5 flex items-center gap-2 text-xs text-foreground/50"><Link href="/" className="hover:text-primary">{tx("الرئيسية", "Home")}</Link><span>/</span><span className="font-bold text-foreground">{tx("البحث عن الرعاية", "Find care")}</span></div><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge variant="success" className="mb-3">{tx("رعاية موثوقة بالقرب منك", "Trusted care near you")}</Badge><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{tx("اعثر على طبيبك المناسب", "Find the right doctor for you")}</h1><p className="mt-2 text-sm text-foreground/55">{tx("ابحث بين الأطباء والعيادات والخدمات الطبية المعتمدة.", "Explore verified doctors, clinics, and diagnostics.")}</p></div><div className="flex w-full gap-2 lg:max-w-xl"><label className="relative min-w-0 flex-1"><Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-primary ${isArabic ? "right-3" : "left-3"}`} /><Input className={isArabic ? "bg-card pe-10" : "bg-card ps-10"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx("اسم الطبيب أو التخصص", "Doctor or specialty")} /></label><Button onClick={() => toast.success(tx("تم تحديث النتائج", "Results updated"))}><Search size={16} />{tx("بحث", "Search")}</Button></div></div></div>
    </section>
    <section className="container-shell py-8 sm:py-10">
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">{[{id:"doctors",ar:"الأطباء",en:"Doctors"},{id:"clinics",ar:"العيادات",en:"Clinics"},{id:"radiology",ar:"مراكز الأشعة",en:"Radiology"},{id:"labs",ar:"المختبرات",en:"Labs"}].map((item) => <button key={item.id} onClick={() => setType(item.id)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-extrabold transition ${type===item.id?"border-primary bg-primary text-white":"border-border bg-card text-foreground/60 hover:border-primary/40"}`}>{tx(item.ar,item.en)}</button>)}</div>
      <div className="grid gap-6 lg:grid-cols-[255px_1fr]">
        <aside className="hidden h-fit rounded-3xl border border-border bg-card p-5 lg:block"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 font-extrabold"><SlidersHorizontal size={17} className="text-primary" />{tx("الفلاتر", "Filters")}</div><button onClick={clear} className="text-xs font-bold text-primary">{tx("إعادة ضبط", "Reset")}</button></div>{filters}</aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">{hasProviders ? tx("العيادات والمراكز", "Clinics & centers") : tx("الأطباء المتاحون", "Available doctors")}</h2><p className="mt-1 text-xs text-foreground/50">{results.isLoading ? tx("جارٍ البحث…", "Searching…") : tx(`${count} نتيجة مطابقة`, `${count} matching results`)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters(!mobileFilters)}><Filter size={15} />{tx("الفلاتر", "Filters")}</Button><label className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs"><ArrowDownUp size={14} className="text-primary" /><select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent font-bold outline-none"><option value="rating">{tx("الأعلى تقييماً", "Top rated")}</option><option value="price">{tx("السعر الأقل", "Lowest price")}</option></select></label></div></div>
          {mobileFilters && <Card className="mb-5 p-5 lg:hidden"><div className="mb-4 flex items-center justify-between"><b>{tx("تصفية النتائج", "Filter results")}</b><button onClick={() => setMobileFilters(false)}><X size={18} /></button></div>{filters}<Button className="mt-5 w-full" onClick={() => setMobileFilters(false)}>{tx("عرض النتائج", "Show results")} {arrow}</Button></Card>}
          {results.isError && <Card className="mb-5 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{tx("تعذر تحميل النتائج. حاول مرة أخرى.", "Could not load results. Please retry.")}</Card>}
          {results.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((i)=><Card key={i} className="p-5"><Skeleton className="h-16 w-16 rounded-full"/><Skeleton className="mt-4 h-5 w-40"/><Skeleton className="mt-3 h-4 w-full"/><Skeleton className="mt-6 h-10 w-full"/></Card>)}</div> : hasProviders ? <div className="grid gap-4 sm:grid-cols-2">{shownProviders.map((provider) => <motion.div key={provider.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><ProviderCard provider={provider} /></motion.div>)}</div> : doctorResults.length ? <div className="grid gap-4 xl:grid-cols-2">{doctorResults.map((doctor,index)=><motion.div key={doctor.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.04}}><DoctorCard doctor={doctor} /></motion.div>)}</div> : <Card className="p-10 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary"><Search /></div><h3 className="text-lg font-extrabold">{tx("لم نعثر على نتائج", "No results found")}</h3><p className="mt-2 text-sm text-foreground/55">{tx("جرّب تغيير التخصص أو المدينة أو إزالة بعض الفلاتر.", "Try another specialty or city, or clear some filters.")}</p><Button variant="outline" className="mt-5" onClick={clear}>{tx("مسح الفلاتر", "Clear filters")}</Button></Card>}
          {!hasProviders && !results.isLoading && doctorResults.length > 0 && <div className="mt-8 flex justify-center"><Button variant="outline" onClick={() => toast.info(tx("أنت تشاهد أحدث النتائج المتاحة", "You're seeing the latest available results"))}>{tx("عرض المزيد من الأطباء", "Load more doctors")} <ChevronDown size={15} /></Button></div>}
        </div>
      </div>
    </section>
  </SiteLayout>;
}
