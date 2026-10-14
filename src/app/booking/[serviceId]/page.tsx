import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";

export const metadata: Metadata = { title: "حجز موعد", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <BookingPage serviceId={serviceId} />;
}
