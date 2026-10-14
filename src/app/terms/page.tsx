import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "الشروط والأحكام", alternates: { canonical: "/terms" }, robots: { index: false, follow: false } };

export default function TermsPage() {
  return <InfoPage titleAr="الشروط والأحكام" titleEn="Terms and conditions" introAr="هذه الشروط توضيحية لنسخة تجريبية، ولا تنشئ خدمة طبية أو حجزاً مؤكداً." introEn="These prototype terms are informational only and do not establish a medical service or confirmed booking." sections={[{ headingAr:"طبيعة الخدمة", headingEn:"Nature of this service", bodyAr:"طِبّي في هذه النسخة واجهة عرض وتجربة. لا تعتمد على المعلومات التجريبية لاتخاذ قرارات صحية أو لتأكيد توفر موعد.", bodyEn:"In this version, Tibbi is a demonstration interface. Do not rely on sample information for health decisions or to confirm an appointment." }, { headingAr:"المواعيد", headingEn:"Appointments", bodyAr:"لا يصبح الموعد مؤكداً إلا من خلال خدمة الحجز الفعلية وإشعار تأكيد صادر عنها. البيانات الحالية تجريبية.", bodyEn:"An appointment is confirmed only through a live booking service and its confirmation notice. The current data is for demonstration." }]} />;
}
