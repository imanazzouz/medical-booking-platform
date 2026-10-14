export interface DirectoryServiceOption {
  id: string; type: string; nameAr: string; nameEn: string; price: number; currency: string;
  bookingMode: "INSTANT" | "APPROVAL_REQUIRED";
  locations: Array<{ id: string; name: string; city: string; timezone: string }>;
}
export interface Doctor {
  id: string; slug: string; nameAr: string; nameEn: string; titleAr: string; titleEn: string;
  specialtyAr: string; specialtyEn: string; rating: number; reviews: number; years: number;
  clinicAr: string; clinicEn: string; cityAr: string; cityEn: string; price: number; nextSlotAr: string; nextSlotEn: string;
  initials: string; tone: string; availableToday?: boolean;
  serviceId?: string; doctorId?: string; locationId?: string; timezone?: string; bookingMode?: "INSTANT" | "APPROVAL_REQUIRED"; currency?: string;
  services?: DirectoryServiceOption[];
}
export const doctors: Doctor[] = [
  { id: "d1", slug: "lina-mansour", nameAr: "د. لينا منصور", nameEn: "Dr. Lina Mansour", titleAr: "أخصائية أمراض القلب", titleEn: "Cardiologist", specialtyAr: "أمراض القلب", specialtyEn: "Cardiology", rating: 4.9, reviews: 184, years: 12, clinicAr: "عيادة النور الطبية", clinicEn: "Al Noor Medical Clinic", cityAr: "باتنة", cityEn: "Batna", price: 2500, nextSlotAr: "اليوم، 16:30", nextSlotEn: "Today, 4:30 PM", initials: "لم", tone: "from-teal-100 to-emerald-50", availableToday: true },
  { id: "d2", slug: "yassine-benmoussa", nameAr: "د. ياسين بن موسى", nameEn: "Dr. Yassine Benmoussa", titleAr: "أخصائي طب الأطفال", titleEn: "Pediatrician", specialtyAr: "طب الأطفال", specialtyEn: "Pediatrics", rating: 4.8, reviews: 126, years: 9, clinicAr: "مركز الأمل الصحي", clinicEn: "Al Amal Health Center", cityAr: "قسنطينة", cityEn: "Constantine", price: 2000, nextSlotAr: "غداً، 10:00", nextSlotEn: "Tomorrow, 10:00 AM", initials: "يب", tone: "from-sky-100 to-cyan-50", availableToday: true },
  { id: "d3", slug: "samira-haddad", nameAr: "د. سميرة حداد", nameEn: "Dr. Samira Haddad", titleAr: "أخصائية طب الجلد", titleEn: "Dermatologist", specialtyAr: "الأمراض الجلدية", specialtyEn: "Dermatology", rating: 5.0, reviews: 98, years: 15, clinicAr: "عيادات الصفاء", clinicEn: "Al Safa Clinics", cityAr: "باتنة", cityEn: "Batna", price: 3000, nextSlotAr: "الأربعاء، 11:15", nextSlotEn: "Wed, 11:15 AM", initials: "سح", tone: "from-rose-100 to-orange-50", availableToday: false },
  { id: "d4", slug: "omar-khelifi", nameAr: "د. عمر الخليفي", nameEn: "Dr. Omar Khelifi", titleAr: "أخصائي جراحة العظام", titleEn: "Orthopedic Surgeon", specialtyAr: "جراحة العظام", specialtyEn: "Orthopedics", rating: 4.9, reviews: 211, years: 18, clinicAr: "المركز الطبي الجامعي", clinicEn: "University Medical Center", cityAr: "سطيف", cityEn: "Setif", price: 2800, nextSlotAr: "غداً، 14:00", nextSlotEn: "Tomorrow, 2:00 PM", initials: "عخ", tone: "from-amber-100 to-yellow-50", availableToday: true },
  { id: "d5", slug: "nour-belkacem", nameAr: "د. نور بلقاسم", nameEn: "Dr. Nour Belkacem", titleAr: "أخصائية أمراض النساء", titleEn: "Gynecologist", specialtyAr: "أمراض النساء", specialtyEn: "Gynecology", rating: 4.9, reviews: 163, years: 11, clinicAr: "عيادة الحياة", clinicEn: "Al Hayat Clinic", cityAr: "باتنة", cityEn: "Batna", price: 2700, nextSlotAr: "الخميس، 09:30", nextSlotEn: "Thu, 9:30 AM", initials: "نب", tone: "from-violet-100 to-fuchsia-50", availableToday: true },
  { id: "d6", slug: "karim-bouali", nameAr: "د. كريم بوعلي", nameEn: "Dr. Karim Bouali", titleAr: "أخصائي طب العيون", titleEn: "Ophthalmologist", specialtyAr: "طب العيون", specialtyEn: "Ophthalmology", rating: 4.7, reviews: 87, years: 7, clinicAr: "مركز الرؤية", clinicEn: "Vision Care Center", cityAr: "قسنطينة", cityEn: "Constantine", price: 2200, nextSlotAr: "السبت، 12:00", nextSlotEn: "Sat, 12:00 PM", initials: "كب", tone: "from-indigo-100 to-blue-50", availableToday: true },
];
export const specialties = [
  { ar: "طب القلب", en: "Cardiology", icon: "heart" }, { ar: "طب الأطفال", en: "Pediatrics", icon: "baby" },
  { ar: "الأمراض الجلدية", en: "Dermatology", icon: "sparkles" }, { ar: "طب الأسنان", en: "Dentistry", icon: "smile" },
  { ar: "أمراض النساء", en: "Gynecology", icon: "venus" }, { ar: "طب العيون", en: "Ophthalmology", icon: "eye" },
  { ar: "جراحة العظام", en: "Orthopedics", icon: "bone" }, { ar: "الطب العام", en: "General practice", icon: "stethoscope" },
];
export interface Provider { id: string; nameAr: string; nameEn: string; typeAr: string; typeEn: string; cityAr: string; cityEn: string; rating: number; reviews: number; services: string; tone: string; initials: string }
export const providers: Provider[] = [
  { id: "p1", nameAr: "مركز الأشعة المتقدم", nameEn: "Advanced Radiology Center", typeAr: "مركز أشعة", typeEn: "Radiology center", cityAr: "باتنة", cityEn: "Batna", rating: 4.8, reviews: 76, services: "MRI · CT · X-Ray", tone: "from-cyan-100 to-sky-50", initials: "أش" },
  { id: "p2", nameAr: "مخبر الأمان للتحاليل", nameEn: "Al Aman Diagnostics", typeAr: "مركز تحاليل", typeEn: "Laboratory", cityAr: "باتنة", cityEn: "Batna", rating: 4.9, reviews: 142, services: "تحاليل شاملة · هرمونات", tone: "from-emerald-100 to-teal-50", initials: "أم" },
  { id: "p3", nameAr: "عيادات الصفاء", nameEn: "Al Safa Clinics", typeAr: "عيادة متعددة التخصصات", typeEn: "Multispecialty clinic", cityAr: "قسنطينة", cityEn: "Constantine", rating: 4.7, reviews: 118, services: "12 تخصصاً طبياً", tone: "from-violet-100 to-fuchsia-50", initials: "صف" },
];
export interface Appointment { id: string; doctor: string; specialty: string; clinic: string; date: string; time: string; status: "confirmed" | "pending" | "completed"; tone: string; initials: string }
export const patientAppointments: Appointment[] = [
  { id: "#TB-20841", doctor: "د. لينا منصور", specialty: "أمراض القلب", clinic: "عيادة النور الطبية · باتنة", date: "الأحد، 18 أكتوبر 2026", time: "16:30", status: "confirmed", tone: "from-teal-100 to-emerald-50", initials: "لم" },
  { id: "#TB-20712", doctor: "د. ياسين بن موسى", specialty: "طب الأطفال", clinic: "مركز الأمل الصحي · قسنطينة", date: "الثلاثاء، 20 أكتوبر 2026", time: "10:00", status: "pending", tone: "from-sky-100 to-cyan-50", initials: "يب" },
  { id: "#TB-19908", doctor: "د. سميرة حداد", specialty: "الأمراض الجلدية", clinic: "عيادات الصفاء · باتنة", date: "الاثنين، 07 سبتمبر 2026", time: "11:15", status: "completed", tone: "from-rose-100 to-orange-50", initials: "سح" },
];
