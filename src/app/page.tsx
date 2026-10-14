import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: "اعثر على الطبيب المناسب واحجز موعدك في العيادات ومراكز الأشعة والتحاليل بسهولة وأمان.",
};

export default function Page() { return <HomePage />; }
