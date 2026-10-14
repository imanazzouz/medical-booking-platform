"use client";

import { SiteLayout } from "@/components/layout/site-layout";
import { useLocale } from "@/lib/i18n/locale-context";
import { Card, CardContent } from "@/components/ui/card";

type InfoPageProps = {
  titleAr: string;
  titleEn: string;
  introAr: string;
  introEn: string;
  sections: Array<{ headingAr: string; headingEn: string; bodyAr: string; bodyEn: string }>;
};

export function InfoPage({ titleAr, titleEn, introAr, introEn, sections }: InfoPageProps) {
  const { isArabic, tx } = useLocale();
  return <SiteLayout><section className="container-shell max-w-4xl py-12 sm:py-16"><p className="text-xs font-bold text-primary">TIBBI · {tx("معلومات","INFORMATION")}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{isArabic ? titleAr : titleEn}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/60">{isArabic ? introAr : introEn}</p><div className="mt-8 space-y-4">{sections.map((section) => <Card key={section.headingEn}><CardContent className="p-5 sm:p-6"><h2 className="font-extrabold">{isArabic ? section.headingAr : section.headingEn}</h2><p className="mt-2 text-sm leading-7 text-foreground/60">{isArabic ? section.bodyAr : section.bodyEn}</p></CardContent></Card>)}</div></section></SiteLayout>;
}
