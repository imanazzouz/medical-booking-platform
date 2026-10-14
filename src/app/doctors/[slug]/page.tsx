import type { Metadata } from "next";
import { DoctorProfilePage } from "@/components/directory/doctor-profile-page";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `ملف الطبيب ${slug}`,
    description: "ملف الطبيب وتخصصاته وخدمات الحجز المتاحة.",
    alternates: { canonical: `/doctors/${encodeURIComponent(slug)}` },
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DoctorProfilePage slug={slug} />;
}
