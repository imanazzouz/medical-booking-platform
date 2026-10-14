import type { ReactNode } from "react";
export function SectionHeading({ eyebrow, title, description, action, align = "right" }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; align?: "right" | "center" }) {
  return <div className={`mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${align === "center" ? "text-center sm:flex-col sm:items-center" : ""}`}>
    <div>{eyebrow && <span className="mb-2 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary"><span className="h-1.5 w-1.5 rounded-full bg-coral" />{eyebrow}</span>}<h2 className="section-title">{title}</h2>{description && <p className="section-subtitle">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}
