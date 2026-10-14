import { doctors, type DirectoryServiceOption, type Doctor } from "@/features/directory/data";

export interface SearchFilters { query?: string; specialty?: string; city?: string; date?: string; sort?: string; priceMax?: number }
export const demoMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ApiService = {
  id: string; type: string; price: string | number; currency?: string; bookingMode: "INSTANT" | "APPROVAL_REQUIRED";
  translations?: Array<{ locale: string; name: string }>;
  locations?: Array<{ location: { id: string; name: string; city: string; timezone: string } }>;
};
type ApiDoctor = {
  id: string; publicSlug: string; yearsOfExperience?: number | null; user?: { name?: string | null };
  specialties?: Array<{ isPrimary?: boolean; specialty: { nameAr?: string; nameEn?: string } }>;
  serviceAssignments?: Array<{ service?: ApiService }>;
};

function mapApiDoctor(record: ApiDoctor): Doctor {
  const specialty = record.specialties?.find((entry) => entry.isPrimary)?.specialty ?? record.specialties?.[0]?.specialty;
  const displayName = record.user?.name ?? record.publicSlug;
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("");
  const services: DirectoryServiceOption[] = (record.serviceAssignments ?? []).flatMap(({ service }) => {
    if (!service) return [];
    return [{
      id: service.id,
      type: service.type,
      nameAr: service.translations?.find((item) => item.locale === "ar")?.name ?? specialty?.nameAr ?? "خدمة طبية",
      nameEn: service.translations?.find((item) => item.locale === "en")?.name ?? specialty?.nameEn ?? "Medical service",
      price: Number(service.price),
      currency: service.currency ?? "DZD",
      bookingMode: service.bookingMode,
      locations: (service.locations ?? []).map(({ location }) => location),
    }];
  });
  const service = services[0];
  const location = service?.locations[0];
  const titleAr = specialty?.nameAr ?? "طبيب";
  const titleEn = specialty?.nameEn ?? "Medical provider";
  return {
    id: record.id,
    slug: record.publicSlug,
    nameAr: displayName,
    nameEn: displayName,
    titleAr,
    titleEn,
    specialtyAr: service?.nameAr ?? titleAr,
    specialtyEn: service?.nameEn ?? titleEn,
    rating: 0,
    reviews: 0,
    years: record.yearsOfExperience ?? 0,
    clinicAr: location?.name ?? "العيادة",
    clinicEn: location?.name ?? "Clinic",
    cityAr: location?.city ?? "",
    cityEn: location?.city ?? "",
    price: service?.price ?? 0,
    nextSlotAr: "",
    nextSlotEn: "",
    initials: initials || "DR",
    tone: "from-teal-100 to-emerald-50",
    serviceId: service?.id,
    doctorId: record.id,
    locationId: location?.id,
    timezone: location?.timezone ?? "Africa/Algiers",
    bookingMode: service?.bookingMode,
    currency: service?.currency ?? "DZD",
    services,
  };
}

export async function searchDoctors(filters: SearchFilters): Promise<Doctor[]> {
  if (!demoMode) {
    const params = new URLSearchParams();
    if (filters.specialty) params.set("specialty", filters.specialty);
    if (filters.city) params.set("city", filters.city);
    params.set("pageSize", "30");
    const response = await fetch(`/api/v1/doctors?${params}`, { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل نتائج البحث");
    const payload = await response.json();
    return (payload.data.items as ApiDoctor[]).map(mapApiDoctor);
  }
  await pause(240);
  let results = [...doctors];
  const search = filters.query?.toLowerCase().trim();
  if (search) results = results.filter((d) => `${d.nameAr} ${d.nameEn} ${d.specialtyAr} ${d.specialtyEn} ${d.clinicAr}`.toLowerCase().includes(search));
  if (filters.specialty) results = results.filter((d) => d.specialtyAr.includes(filters.specialty!) || d.specialtyEn.toLowerCase().includes(filters.specialty!.toLowerCase()));
  if (filters.city) results = results.filter((d) => d.cityAr.includes(filters.city!) || d.cityEn.toLowerCase().includes(filters.city!.toLowerCase()));
  if (filters.priceMax) results = results.filter((d) => d.price <= filters.priceMax!);
  if (filters.sort === "rating") results.sort((a, b) => b.rating - a.rating);
  if (filters.sort === "price") results.sort((a, b) => a.price - b.price);
  return results;
}

export async function getDoctor(slug: string): Promise<Doctor | undefined> {
  if (!demoMode) {
    const response = await fetch(`/api/v1/doctors/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) return undefined;
      throw new Error("تعذر تحميل بيانات الطبيب");
    }
    return mapApiDoctor((await response.json()).data as ApiDoctor);
  }
  await pause(180);
  return doctors.find((doctor) => doctor.slug === slug || doctor.id === slug) ?? doctors[0];
}

export interface AvailabilitySlot { id: string; startsAt: string }

/** Converts clinic-local midnight boundaries to UTC without assuming every local day is 24 hours. */
export function getClinicDayRange(date: Date, timezone: string): { from: Date; to: Date } {
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [year, month, day] = dateKey.split("-").map(Number);
  const localMidnightToUtc = (y: number, m: number, d: number): Date => {
    const targetWallTime = Date.UTC(y, m - 1, d);
    let instant = targetWallTime;
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    for (let i = 0; i < 3; i += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
      const representedWallTime = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
      instant += targetWallTime - representedWallTime;
    }
    return new Date(instant);
  };
  const from = localMidnightToUtc(year, month, day);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const to = localMidnightToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return { from, to };
}

export async function getAvailableSlots(
  serviceId: string,
  date: Date,
  options: { doctorId?: string; locationId?: string; timezone?: string } = {},
): Promise<AvailabilitySlot[]> {
  if (!demoMode) {
    const { from, to } = getClinicDayRange(date, options.timezone ?? "Africa/Algiers");
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (options.doctorId) params.set("doctorId", options.doctorId);
    if (options.locationId) params.set("locationId", options.locationId);
    const response = await fetch(`/api/v1/services/${serviceId}/slots?${params}`, { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل المواعيد المتاحة");
    const payload = await response.json();
    return payload.data.slots.map((slot: { id: string; startsAt: string }) => ({ id: slot.id, startsAt: slot.startsAt }));
  }
  await pause(180);
  return ["09:00", "09:30", "10:30", "11:00", "12:30", "14:00", "15:30", "16:00"].map((time, index) => ({ id: `demo-${serviceId}-${date.toISOString().slice(0, 10)}-${index}`, startsAt: time }));
}
