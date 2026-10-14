import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", { variants: { variant: { default: "bg-secondary text-secondary-foreground", success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", coral: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200", outline: "border border-border text-foreground/70", blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" } }, defaultVariants: { variant: "default" } });
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
