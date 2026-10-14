"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { arDZ } from "date-fns/locale/ar-DZ";
import { enUS } from "date-fns/locale/en-US";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, Clock3, LockKeyhole, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SiteLayout } from "@/components/layout/site-layout";
import { DoctorAvatar } from "@/components/directory/doctor-avatar";
import { useAvailableSlots, useDoctor } from "@/features/directory/hooks";
import { demoMode, getClinicDayRange } from "@/features/directory/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/lib/i18n/locale-context";
import { csrfRequestHeader } from "@/lib/security/csrf-client";
import { toast } from "sonner";

export function BookingPage({ serviceId: clinicianId }: { serviceId: string }) {
  const { isArabic, tx } = useLocale();
  const router = useRouter();
  const doctorQuery = useDoctor(clinicianId);
  const doctor = doctorQuery.data;
  const [chosenServiceId, setChosenServiceId] = useState<string | null>(null);
  const [chosenLocationId, setChosenLocationId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(startOfDay(new Date()), index)), []);
  const services = doctor?.services ?? [];
  const activeService = services.find((service) => service.id === chosenServiceId) ?? services[0] ?? (doctor?.serviceId ? {
    id: doctor.serviceId, type: "CONSULTATION", nameAr: doctor.specialtyAr, nameEn: doctor.specialtyEn,
    price: doctor.price, currency: doctor.currency ?? "DZD", bookingMode: doctor.bookingMode ?? "INSTANT", locations: [],
  } : demoMode ? {
    id: clinicianId, type: "CONSULTATION", nameAr: doctor?.specialtyAr ?? "استشارة طبية", nameEn: doctor?.specialtyEn ?? "Consultation",
    price: doctor?.price ?? 0, currency: doctor?.currency ?? "DZD", bookingMode: "INSTANT" as const, locations: [],
  } : undefined);
  const locations = activeService?.locations ?? [];
  const location = locations.find((item) => item.id === chosenLocationId) ?? locations[0];
  const timezone = location?.timezone ?? doctor?.timezone ?? "Africa/Algiers";
  const slotsQuery = useAvailableSlots(activeService?.id ?? "", selectedDate, {
    doctorId: demoMode ? undefined : doctor?.doctorId ?? doctor?.id,
    locationId: demoMode ? undefined : location?.id,
    timezone,
  });

  const booking = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error(tx("اختر وقتاً متاحاً", "Choose an available time"));
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return { bookingReference: `MB${Math.floor(10000 + Math.random() * 89999)}`, status: "CONFIRMED" };
      }
      idempotencyKey.current ??= window.crypto.randomUUID();
      const csrfHeader = await csrfRequestHeader();
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey.current, ...csrfHeader },
        body: JSON.stringify({ slotId: selectedSlot }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? tx("تعذر تأكيد الحجز", "Booking could not be completed"));
      return result.data as { bookingReference: string; status: string; holdExpiresAt?: string | null };
    },
    onSuccess: (data) => {
      const pending = data.status === "PENDING";
      toast.success(
        pending ? tx("تم إرسال طلب الحجز", "Booking request submitted") : tx("تم تأكيد موعدك بنجاح", "Your appointment is confirmed"),
        { description: data.bookingReference ? `${tx("رقم الحجز", "Booking reference")}: ${data.bookingReference}` : undefined },
      );
      idempotencyKey.current = null;
      router.push("/dashboard/patient");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : tx("تعذر إتمام الحجز", "Booking could not be completed")),
  });

  const waitlist = useMutation({
    mutationFn: async () => {
      if (!activeService) throw new Error(tx("الخدمة غير متاحة للحجز حالياً", "This service is not bookable right now"));
      if (demoMode) throw new Error(tx("قائمة الانتظار متاحة بعد ربط النظام بقاعدة البيانات", "Waitlist requires the live booking system"));
      const { from, to } = getClinicDayRange(selectedDate, timezone);
      const earliestAt = new Date(Math.max(from.getTime(), Date.now() + 60_000));
      const latestAt = new Date(to.getTime() - 1);
      if (earliestAt >= latestAt) throw new Error(tx("لم يتبق وقت في هذا اليوم؛ اختر تاريخاً آخر", "There is no remaining time today; choose another date"));
      const csrfHeader = await csrfRequestHeader();
      const response = await fetch("/api/v1/waitlist", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", ...csrfHeader },
        body: JSON.stringify({ serviceId: activeService.id, doctorId: doctor?.doctorId ?? doctor?.id ?? null, locationId: location?.id ?? null, earliestAt: earliestAt.toISOString(), latestAt: latestAt.toISOString() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? tx("تعذر الانضمام إلى قائمة الانتظار", "Could not join the waitlist"));
      return result.data;
    },
    onSuccess: () => {
      setWaitlistJoined(true);
      toast.success(tx("أُضيف طلبك إلى قائمة الانتظار", "You joined the waitlist"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : tx("تعذر الانضمام إلى قائمة الانتظار", "Could not join the waitlist")),
  });

  if (doctorQuery.isLoading) return <SiteLayout><div className="container-shell py-10"><Skeleton className="h-28 rounded-3xl" /><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"><Skeleton className="h-[520px] rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div></div></SiteLayout>;
  if (doctorQuery.isError || !doctor) return <SiteLayout><div className="container-shell py-16"><Card><CardContent className="p-8 text-center"><h1 className="text-xl font-black">{tx("تعذر تحميل بيانات الطبيب", "Could not load provider details")}</h1><p className="mt-2 text-sm text-foreground/60">{doctorQuery.error instanceof Error ? doctorQuery.error.message : tx("الطبيب غير موجود أو لم يعد متاحاً.", "The provider was not found or is no longer available.")}</p><Button className="mt-5" variant="outline" onClick={() => doctorQuery.refetch()}>{tx("إعادة المحاولة", "Try again")}</Button></CardContent></Card></div></SiteLayout>;

  const locale = isArabic ? arDZ : enUS;
  const arrow = isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />;
  const displayTime = (value: string) => {
    if (!value.includes("T")) return value;
    return new Intl.DateTimeFormat(isArabic ? "ar-DZ" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
  };
  const selectedSlotStartsAt = slotsQuery.data?.find((slot) => slot.id === selectedSlot)?.startsAt;
  const providerName = isArabic ? doctor.nameAr : doctor.nameEn;
  const serviceName = activeService ? (isArabic ? activeService.nameAr : activeService.nameEn) : tx("لا توجد خدمة نشطة", "No active service");

  return <SiteLayout>
    <section className="border-b border-border bg-gradient-to-l from-mint/60 to-background py-7"><div className="container-shell"><div className="mb-3 text-xs text-foreground/50">{tx("الرئيسية / الأطباء / حجز موعد", "Home / Doctors / Book")}</div><h1 className="text-2xl font-black sm:text-3xl">{tx("احجز موعدك", "Book your appointment")}</h1><p className="mt-2 text-sm text-foreground/55">{tx("اختر الخدمة والطبيب والتاريخ والوقت الأنسب لك.", "Choose a service, clinician, date, and time that work for you.")}</p></div></section>
    <section className="container-shell grid gap-6 py-7 lg:grid-cols-[1fr_360px] lg:py-9">
      <div className="space-y-5">
        <Card><CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">1</span><div><h2 className="font-extrabold">{tx("الخدمة والطبيب", "Service and clinician")}</h2><p className="mt-1 text-xs text-foreground/50">{tx("أُحيلت إلى هذا الطبيب؛ اختر الخدمة المناسبة.", "This clinician is selected. Choose the appropriate service.")}</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-4"><DoctorAvatar initials={doctor.initials} tone={doctor.tone} size="sm"/><div className="min-w-0"><b className="block truncate text-sm">{providerName}</b><p className="mt-1 text-xs text-primary">{isArabic ? doctor.titleAr : doctor.titleEn}</p></div><BadgeCheck size={17} className="ms-auto shrink-0 text-primary" /></div>
          {services.length > 1 && <label className="mt-4 block text-xs font-bold">{tx("نوع الخدمة", "Service type")}<select value={activeService?.id ?? ""} disabled={booking.isPending} onChange={(event) => { setChosenServiceId(event.target.value); setSelectedSlot(null); idempotencyKey.current = null; setWaitlistJoined(false); }} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"><option value="" disabled>{tx("اختر الخدمة", "Choose a service")}</option>{services.map((service) => <option key={service.id} value={service.id}>{isArabic ? service.nameAr : service.nameEn}</option>)}</select></label>}
          {locations.length > 1 && <label className="mt-4 block text-xs font-bold">{tx("الفرع", "Location")}<select value={location?.id ?? ""} disabled={booking.isPending} onChange={(event) => { setChosenLocationId(event.target.value); setSelectedSlot(null); idempotencyKey.current = null; setWaitlistJoined(false); }} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">{locations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label>}
          {!activeService && !demoMode && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{tx("لا توجد خدمة نشطة مرتبطة بهذا الطبيب حالياً.", "No active service is currently linked to this provider.")}</p>}
        </CardContent></Card>

        <Card><CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">2</span><div><h2 className="font-extrabold">{tx("اختر التاريخ", "Choose a date")}</h2><p className="mt-1 text-xs text-foreground/50">{tx(`المواعيد بالتوقيت المحلي للعيادة (${timezone})`, `Times shown in the clinic's local timezone (${timezone})`)}</p></div></div><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{dates.map((date) => <button key={date.toISOString()} disabled={booking.isPending} onClick={() => { setSelectedDate(date); setSelectedSlot(null); idempotencyKey.current = null; setWaitlistJoined(false); }} className={`rounded-2xl border p-2.5 text-center transition sm:p-3 ${isSameDay(date, selectedDate) ? "border-primary bg-primary text-white shadow-md shadow-primary/20" : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"}`}><span className={`block text-[10px] font-semibold ${isSameDay(date, selectedDate) ? "text-white/75" : "text-foreground/45"}`}>{format(date, "EEE", { locale })}</span><b className="my-1 block text-lg">{format(date, "d")}</b><span className={`block text-[10px] ${isSameDay(date, selectedDate) ? "text-white/75" : "text-foreground/45"}`}>{format(date, "MMM", { locale })}</span></button>)}</div></CardContent></Card>

        <Card><CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">3</span><div><h2 className="font-extrabold">{tx("اختر الوقت", "Choose a time")}</h2><p className="mt-1 text-xs text-foreground/50">{format(selectedDate, "EEEE, d MMMM", { locale })}</p></div></div><Badge variant="success"><span className="h-1.5 w-1.5 rounded-full bg-success" />{tx("متاح", "Available")}</Badge></div>
          {slotsQuery.isLoading ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-11 rounded-xl" />)}</div> : slotsQuery.isError ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{tx("تعذر تحميل الأوقات المتاحة.", "Could not load available times.")} <button className="ms-2 underline" onClick={() => slotsQuery.refetch()}>{tx("إعادة المحاولة", "Retry")}</button></div> : slotsQuery.data?.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slotsQuery.data.map((slot) => <button key={slot.id} disabled={booking.isPending} onClick={() => { setSelectedSlot(slot.id); idempotencyKey.current = null; }} className={`rounded-xl border px-3 py-3 text-sm font-extrabold transition ${selectedSlot === slot.id ? "border-primary bg-primary text-white shadow-md" : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"}`}><Clock3 size={14} className="mx-auto mb-1" />{displayTime(slot.startsAt)}</button>)}</div> : <div className="space-y-3 rounded-2xl bg-secondary/60 p-5 text-center"><p className="text-sm text-foreground/60">{tx("لا توجد مواعيد متاحة في هذا اليوم. جرّب يوماً آخر أو انضم إلى قائمة الانتظار.", "No appointments on this date. Try another day or join the waitlist.")}</p>{!demoMode && <Button variant="outline" disabled={!activeService || waitlistJoined || waitlist.isPending} onClick={() => waitlist.mutate()}><UsersRound size={16} />{waitlistJoined ? tx("أنت في قائمة الانتظار", "You are on the waitlist") : waitlist.isPending ? tx("جارٍ الإرسال…", "Submitting…") : tx("انضم إلى قائمة الانتظار لهذا اليوم", "Join the waitlist for this day")}</Button>}</div>}
          <p className="mt-4 flex items-center gap-2 text-[11px] text-foreground/45"><Sparkles size={14} className="text-coral" />{tx("تُعاد مراجعة التوافر عند تأكيد الحجز لحمايتك من التعارض.", "Availability is rechecked at confirmation to prevent double-booking.")}</p>
        </CardContent></Card>

        <Card><CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">4</span><div><h2 className="font-extrabold">{tx("تأكيد بيانات المريض", "Patient confirmation")}</h2><p className="mt-1 text-xs text-foreground/50">{tx("يلزم تسجيل الدخول بصفة مريض لإتمام الحجز.", "Sign in with a patient account to complete the booking.")}</p></div></div><p className="flex items-start gap-2 text-xs leading-5 text-foreground/55"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />{tx("لا نطلب أو نعرض بيانات صحية حساسة في هذه الخطوة. ستُستخدم بيانات حسابك المسجل فقط.", "We do not request or display sensitive health information here. Only your registered account details are used.")}</p></CardContent></Card>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24"><Card className="overflow-hidden"><div className="bg-secondary/65 px-5 py-4"><h2 className="font-extrabold">{tx("ملخص الحجز", "Booking summary")}</h2></div><CardContent className="p-5"><div className="flex items-center gap-3"><DoctorAvatar initials={doctor.initials} tone={doctor.tone} size="sm"/><div className="min-w-0"><b className="block truncate text-sm">{providerName}</b><p className="mt-1 text-xs text-primary">{serviceName}</p></div><BadgeCheck size={17} className="ms-auto shrink-0 text-primary" /></div><div className="mt-5 space-y-3 border-y border-border py-4 text-xs"><div className="flex items-center gap-2 text-foreground/60"><MapPin size={15} className="text-primary" />{location ? `${location.name} · ${location.city}` : (isArabic ? doctor.clinicAr : doctor.clinicEn)}</div><div className="flex items-center gap-2 text-foreground/60"><CalendarDays size={15} className="text-primary" />{format(selectedDate, "EEEE, d MMMM", { locale })}</div><div className="flex items-center gap-2 text-foreground/60"><Clock3 size={15} className="text-primary" />{selectedSlotStartsAt ? displayTime(selectedSlotStartsAt) : tx("لم يتم الاختيار", "Not selected")}</div></div><div className="flex items-center justify-between py-4"><span className="text-xs text-foreground/55">{tx("رسوم الكشف", "Consultation fee")}</span><b className="text-lg">{(activeService?.price ?? doctor.price).toLocaleString()} <span className="text-xs font-semibold text-foreground/50">{activeService?.currency ?? doctor.currency ?? "DZD"}</span></b></div>{activeService?.bookingMode === "APPROVAL_REQUIRED" && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{tx("هذا الموعد طلب حجز ويحتاج موافقة الطبيب.", "This is a booking request and requires provider approval.")}</p>}<Button className="w-full" size="lg" disabled={!selectedSlot || booking.isPending} onClick={() => booking.mutate()}>{booking.isPending ? tx("جارٍ التأكيد…", "Submitting…") : activeService?.bookingMode === "APPROVAL_REQUIRED" ? tx("إرسال طلب الحجز", "Request appointment") : tx("تأكيد الحجز", "Confirm booking")} {!booking.isPending && arrow}</Button><p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-foreground/45"><LockKeyhole size={12} />{tx("لا يتم تحصيل أي مبلغ الآن", "No payment is collected now")}</p></CardContent></Card><Card className="border-primary/10 bg-secondary/30"><CardContent className="flex gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary dark:bg-slate-800"><Check size={17} /></span><p className="text-xs leading-5 text-foreground/60">{tx("تُطبّق سياسة الإلغاء الخاصة بالخدمة على موعدك.", "The service's cancellation policy applies to your appointment.")}</p></CardContent></Card></aside>
    </section>
  </SiteLayout>;
}
