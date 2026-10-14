import { cn } from "@/lib/utils";
export function DoctorAvatar({ initials, tone, size = "md" }: { initials: string; tone: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "h-11 w-11 text-sm", md: "h-16 w-16 text-lg", lg: "h-24 w-24 text-2xl", xl: "h-32 w-32 text-4xl" };
  return <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br font-black text-primary shadow-sm dark:border-slate-800", tone, sizes[size])} aria-hidden="true">{initials}</div>;
}
