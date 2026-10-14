import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "الإدارة", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminDashboard />;
}
