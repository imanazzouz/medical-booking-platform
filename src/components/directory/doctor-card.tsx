"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, CalendarClock, Heart, MapPin, Star } from "lucide-react";
import { Doctor } from "@/features/directory/data";
import { useLocale } from "@/lib/i18n/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DoctorAvatar } from "@/components/directory/doctor-avatar";
import { toast } from "sonner";
export function DoctorCard({ doctor, compact = false }: { doctor: Doctor; compact?: boolean }) {
  const { isArabic, tx } = useLocale();
  const [saved, setSaved] = useState(false);
  const name = isArabic ? doctor.nameAr : doctor.nameEn;
  const specialty = isArabic ? doctor.titleAr : doctor.titleEn;
  return <Card className="group relative flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-float sm:p-6">
    <button aria-label={saved ? tx("إزالة من المفضلة", "Remove from saved") : tx("حفظ الطبيب", "Save doctor")} onClick={() => { setSaved(!saved); toast.success(saved ? tx("أزيل من المفضلة", "Removed from saved") : tx("أضيف إلى المفضلة", "Saved for later")); }} className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground/45 transition hover:text-rose-500"><Heart size={17} fill={saved ? "currentColor" : "none"} className={saved ? "text-rose-500" : ""} /></button>
    <div className="flex items-start gap-4"><DoctorAvatar initials={doctor.initials} tone={doctor.tone} size="md" /><div className="min-w-0 pt-1"><div className="flex items-center gap-1 text-sm font-extrabold"><span className="truncate">{name}</span><BadgeCheck size={16} className="shrink-0 fill-primary text-white" /></div><p className="mt-1 text-xs font-medium text-primary">{specialty}</p><div className="mt-2 flex items-center gap-1 text-xs"><Star size={13} className="fill-amber-400 text-amber-400" /><b>{doctor.rating.toFixed(1)}</b><span className="text-foreground/45">({doctor.reviews} {tx("تقييم", "reviews")})</span></div></div></div>
    <div className="my-5 space-y-2.5 border-y border-border py-4 text-xs text-foreground/60"><div className="flex items-center gap-2"><MapPin size={14} className="text-primary" />{isArabic ? doctor.clinicAr : doctor.clinicEn} · {isArabic ? doctor.cityAr : doctor.cityEn}</div><div className="flex items-center gap-2"><CalendarClock size={14} className="text-primary" />{tx("أقرب موعد", "Next available")} <span className="font-bold text-foreground">{isArabic ? doctor.nextSlotAr : doctor.nextSlotEn}</span></div></div>
    <div className="mt-auto flex items-end justify-between gap-3"><div><span className="block text-[10px] text-foreground/45">{tx("سعر الكشف يبدأ من", "Consultation from")}</span><strong className="mt-0.5 inline-block text-lg font-black">{doctor.price.toLocaleString(isArabic ? "ar-DZ" : "en-US")} <span className="text-xs font-semibold text-foreground/50">{tx("دج", "DZD")}</span></strong></div><Button size={compact ? "sm" : "default"} asChild><Link href={`/doctors/${doctor.slug}`}>{tx("احجز", "Book")} {isArabic ? <ArrowUpLeft size={15} /> : <ArrowUpRight size={15} />}</Link></Button></div>
    {doctor.availableToday && <Badge variant="success" className="absolute start-4 top-4">{tx("متاح اليوم", "Today")}</Badge>}
  </Card>;
}
