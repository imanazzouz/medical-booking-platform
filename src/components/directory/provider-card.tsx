"use client";
import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Building2, MapPin, Star } from "lucide-react";
import { Provider } from "@/features/directory/data";
import { useLocale } from "@/lib/i18n/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export function ProviderCard({ provider }: { provider: Provider }) {
  const { isArabic, tx } = useLocale();
  return <Card className="flex flex-col p-5 transition hover:-translate-y-1 hover:shadow-float sm:p-6">
    <div className={`mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${provider.tone} text-lg font-black text-primary`}>{provider.initials}</div>
    <Badge variant="outline" className="mb-3 w-fit"><Building2 size={13} />{isArabic ? provider.typeAr : provider.typeEn}</Badge>
    <h3 className="text-lg font-extrabold">{isArabic ? provider.nameAr : provider.nameEn}</h3>
    <div className="mt-2 flex items-center gap-1 text-xs text-foreground/60"><MapPin size={14} />{isArabic ? provider.cityAr : provider.cityEn}<span className="mx-1">·</span>{provider.services}</div>
    <div className="mt-4 flex items-center gap-1 text-sm"><Star size={14} className="fill-amber-400 text-amber-400" /><b>{provider.rating}</b><span className="text-xs text-foreground/45">({provider.reviews})</span></div>
    <Button asChild variant="outline" className="mt-5 w-full"><Link href={`/providers/${provider.id}`}>{tx("عرض المركز", "View center")} {isArabic ? <ArrowUpLeft size={15} /> : <ArrowUpRight size={15} />}</Link></Button>
  </Card>;
}
