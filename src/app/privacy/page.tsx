import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "الخصوصية", alternates: { canonical: "/privacy" }, robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return <InfoPage titleAr="الخصوصية" titleEn="Privacy" introAr="هذه الصفحة توضيحية لنسخة النموذج الأولي، وليست سياسة خصوصية قانونية نهائية." introEn="This notice is for the prototype and is not a final, legally reviewed privacy policy." sections={[{ headingAr:"البيانات التجريبية", headingEn:"Prototype data", bodyAr:"قد تعرض الواجهة بيانات تجريبية. لا تُدخل معلومات صحية أو شخصية حقيقية في هذا النموذج.", bodyEn:"The interface may show sample data. Do not submit real personal or health information through this prototype." }, { headingAr:"قبل الإطلاق الفعلي", headingEn:"Before a production launch", bodyAr:"يجب نشر سياسة خصوصية معتمدة توضّح البيانات التي تُجمع وأغراض استخدامها ومدة الاحتفاظ بها وحقوق المستخدمين وآليات التواصل.", bodyEn:"A reviewed privacy policy must be published before production, describing collected data, purposes, retention, user rights, and contact channels." }]} />;
}
