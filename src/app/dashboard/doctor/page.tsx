import type { Metadata } from "next";
import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard";

export const metadata: Metadata = { title: "لوحة الطبيب", robots: { index: false, follow: false } };

export default function DoctorDashboardPage() {
  return <DoctorDashboard />;
}
