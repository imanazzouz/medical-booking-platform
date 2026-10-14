"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, Baby, Bone, CalendarCheck, Eye, HeartPulse, ShieldCheck, Smile, Sparkles, Star, Stethoscope, Users, Venus, Zap } from "lucide-react";
import { SiteLayout } from "@/components/layout/site-layout";
import { SearchHeroForm } from "@/components/home/search-hero-form";
import { DoctorCard } from "@/components/directory/doctor-card";
import { ProviderCard } from "@/components/directory/provider-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { doctors, providers, specialties } from "@/features/directory/data";
import { useDoctors } from "@/features/directory/hooks";
import { useLocale } from "@/lib/i18n/locale-context";

const specialtyIcons = [HeartPulse, Baby, Sparkles, Smile, Venus, Eye, Bone, Stethoscope];
export function HomePage() {
  const { isArabic, tx } = useLocale();
  const featured = useDoctors({ sort: "rating" });
  const go = isArabic ? <ArrowLeft size={17} /> : <ArrowRight size={17} />;
  return <SiteLayout>
    <section className="relative overflow-hidden bg-hero-glow">
      <div className="container-shell relative grid min-h-[650px] items-center gap-8 py-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:py-16">
        <div className="relative z-10 order-1">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <span className="eyebrow"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>{tx("رعايتك الصحية تبدأ من هنا", "Your care journey starts here")}</span>
            <h1 className="mt-4 max-w-2xl text-[2.5rem] font-black leading-[1.22] tracking-tight text-navy dark:text-white sm:text-5xl lg:text-[3.65rem]">{tx("موعدك الطبي،\nبسهولة واطمئنان", "The right care,\nright on time.")}</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-navy/65 dark:text-white/60 sm:text-lg">{tx("اكتشف أطباء موثوقين، قارن المواعيد، واحجز زيارتك القادمة في دقائق.", "Find trusted doctors, compare real availability, and book your next visit in minutes.")}</p>
            <div className="mt-8"><SearchHeroForm /></div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-navy/60 dark:text-white/60">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-primary" />{tx("جهات طبية معتمدة", "Verified providers")}</span>
              <span className="flex items-center gap-2"><Zap size={15} className="text-coral" />{tx("حجز سريع ومجاني", "Fast, free booking")}</span>
              <span className="flex items-center gap-2"><Star size={15} className="fill-amber-400 text-amber-400" /><b className="text-navy dark:text-white">4.9/5</b>{tx("من آلاف المرضى", "from local patients")}</span>
            </div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, x: isArabic ? -25 : 25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, delay: .1 }} className="relative order-2 mx-auto w-full max-w-[490px] lg:max-w-none">
          <div className="relative mx-auto aspect-[.94] max-h-[530px] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-100 via-white to-orange-50 shadow-float">
            <Image src="/images/hero-doctor.jpg" alt={tx("طبيبة تبتسم في عيادة حديثة", "Doctor welcoming a patient in a modern clinic")} fill priority sizes="(max-width: 1024px) 90vw, 44vw" className="object-cover object-[60%_center]" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/20 via-transparent to-white/10" />
          </div>
          <div className={`absolute top-[18%] ${isArabic ? "-right-5 sm:-right-10" : "-left-5 sm:-left-10"} animate-float rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-soft backdrop-blur sm:p-4 dark:bg-slate-900/95`}>
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-success"><CalendarCheck size={19} /></span><span><b className="block text-sm">{tx("تم تأكيد موعدك", "Appointment confirmed")}</b><small className="mt-1 block text-[11px] text-foreground/50">{tx("د. لينا · اليوم 16:30", "Dr. Lina · Today, 4:30 PM")}</small></span><BadgeCheck size={17} className="text-primary" /></div>
          </div>
          <div className={`absolute bottom-[13%] ${isArabic ? "-left-3 sm:-left-10" : "-right-3 sm:-right-10"} rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-soft backdrop-blur sm:p-4 dark:bg-slate-900/95`}>
            <div className="flex items-center gap-3"><span className="flex -space-x-2 rtl:space-x-reverse">{["bg-rose-200", "bg-sky-200", "bg-amber-200"].map((c, i) => <span key={i} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[9px] font-black text-navy ${c}`}>{["م", "س", "ع"][i]}</span>)}</span><span><b className="block text-sm">{tx("١٢ ألف+", "12k+")}</b><small className="text-[11px] text-foreground/50">{tx("مريض يثق بنا", "patients trust us")}</small></span><span className="grid h-9 w-9 place-items-center rounded-full bg-orange-50 text-coral"><HeartPulse size={17} /></span></div>
          </div>
          <div className={`absolute -top-7 ${isArabic ? "left-12" : "right-12"} -z-0 h-24 w-24 rounded-full border-[18px] border-white/50`} />
        </motion.div>
      </div>
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
    </section>

    <section className="container-shell py-16 sm:py-20">
      <SectionHeading eyebrow={tx("اعثر على الرعاية المناسبة", "Find your care")} title={tx("ما الذي تحتاجه اليوم؟", "What care are you looking for?")} description={tx("من استشارة سريعة إلى فحص متخصص، كل ما تحتاجه في مكان واحد.", "From a quick consultation to specialized diagnostics, it’s all in one place.")} action={<Link href="/search" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary">{tx("عرض كل الخدمات", "Explore all care")} {go}</Link>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {specialties.map((specialty, index) => { const Icon = specialtyIcons[index]; return <Link href={`/search?specialty=${encodeURIComponent(isArabic ? specialty.ar : specialty.en)}`} key={specialty.en} className="group rounded-2xl border border-border/70 bg-card p-4 text-center transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-soft sm:p-5"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-white"><Icon size={21} /></span><span className="block text-xs font-bold leading-5 text-foreground/80">{isArabic ? specialty.ar : specialty.en}</span></Link>; })}
      </div>
    </section>

    <section className="bg-white/70 py-16 dark:bg-white/[.02] sm:py-20">
      <div className="container-shell">
        <SectionHeading eyebrow={tx("اختيارات موثوقة", "Care you can trust")} title={tx("أطباء يوصي بهم المرضى", "Doctors patients recommend")} description={tx("خبرة طبية وإنسانية، ومواعيد تناسب جدولك.", "Expertise, empathy, and appointment times that fit your day.")} action={<Button variant="outline" asChild><Link href="/search">{tx("كل الأطباء", "All doctors")} {go}</Link></Button>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading ? [1, 2, 3].map((i) => <Card key={i} className="p-6"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="mt-5 h-5 w-40" /><Skeleton className="mt-3 h-4 w-28" /><Skeleton className="mt-8 h-11 w-full" /></Card>) : (featured.data ?? doctors.slice(0, 3)).slice(0, 3).map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}
        </div>
      </div>
    </section>

    <section className="container-shell py-16 sm:py-20">
      <SectionHeading eyebrow={tx("خدمات متكاملة", "More than appointments")} title={tx("الرعاية الصحية، من الألف إلى الياء", "Care for every step of the way")} description={tx("احجز في العيادات ومراكز الأشعة والمختبرات الموثوقة بالقرب منك.", "Book trusted clinics, imaging centers, and labs near you.")} />
      <div className="grid gap-4 md:grid-cols-3">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>
    </section>

    <section className="container-shell pb-16 sm:pb-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/10" /><div className="absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><span className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-white/75"><Users size={15} />{tx("لأن وقتك وصحتك مهمّان", "Your time and health matter")}</span><h2 className="max-w-2xl text-2xl font-black leading-snug sm:text-3xl">{tx("خطوة بسيطة اليوم،\nلصحة أفضل غداً.", "One small step today.\nA healthier tomorrow.")}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/75">{tx("ابدأ بالعثور على طبيبك المناسب واحجز موعدك القادم بكل سهولة.", "Find the right doctor and book your next visit with confidence.")}</p></div><Button variant="coral" size="lg" asChild className="shrink-0"><Link href="/search">{tx("ابدأ البحث الآن", "Start your search")} {go}</Link></Button></div>
      </div>
    </section>
  </SiteLayout>;
}
