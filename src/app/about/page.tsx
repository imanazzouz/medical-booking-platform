import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "عن طِبّي", alternates: { canonical: "/about" }, robots: { index: false, follow: false } };

export default function AboutPage() {
  return <InfoPage titleAr="الرعاية الصحية أقرب إليك" titleEn="Healthcare, closer to you" introAr="طِبّي منصة تجريبية لتسهيل العثور على الأطباء والجهات الطبية وحجز المواعيد في الجزائر." introEn="Tibbi is a prototype platform designed to make it easier to find doctors and healthcare providers and book appointments in Algeria." sections={[{ headingAr:"رؤيتنا", headingEn:"Our vision", bodyAr:"نطمح إلى جعل الوصول إلى الرعاية الصحية أكثر وضوحاً وسهولة، مع تجربة رقمية تحترم وقت المريض واحتياجات الممارس الصحي.", bodyEn:"We aim to make access to healthcare clearer and easier with a digital experience that respects patients’ time and clinicians’ needs." }, { headingAr:"نسخة تجريبية", headingEn:"Prototype", bodyAr:"بعض بيانات الأطباء والحجوزات والجهات المعروضة هنا تجريبية، وقد لا تمثل جهات أو مواعيد فعلية.", bodyEn:"Some doctor, booking, and provider information shown here is sample data and may not represent real providers or availability." }]} />;
}
