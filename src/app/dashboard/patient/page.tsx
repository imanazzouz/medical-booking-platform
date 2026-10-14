import type { Metadata } from "next";
import { PatientDashboard } from "@/components/dashboard/patient-dashboard";

export const metadata: Metadata = { title: "حساب المريض", robots: { index: false, follow: false } };

export default function PatientDashboardPage() {
  return <PatientDashboard />;
}
