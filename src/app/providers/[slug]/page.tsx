import type { Metadata } from "next";
import { ProviderProfilePage } from "@/components/directory/provider-profile-page";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `الجهة الطبية ${slug}`,
    description: "معلومات الجهة الطبية والخدمات والمواعيد المتاحة.",
    alternates: { canonical: `/providers/${encodeURIComponent(slug)}` },
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProviderProfilePage id={slug} />;
}
