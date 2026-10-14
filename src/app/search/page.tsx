import type { Metadata } from "next";
import { SearchPageClient } from "@/components/search/search-page-client";

const indexable = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false" && process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true";
export const metadata: Metadata = {
  title: "ابحث عن طبيب أو خدمة طبية",
  description: "ابحث عن الأطباء والعيادات ومراكز الأشعة والتحاليل وقارن الخدمات والمواعيد المتاحة.",
  alternates: { canonical: "/search" },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const pick = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return <SearchPageClient initialQuery={pick(params.query)} initialCity={pick(params.city)} initialSpecialty={pick(params.specialty)} initialType={pick(params.type) || "doctors"} />;
}
