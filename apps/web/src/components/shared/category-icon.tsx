import {
  BookOpen,
  Briefcase,
  GraduationCap,
  HardHat,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface CategoryStyle {
  icon: LucideIcon;
  tint: string;
}

/** One icon and tint per opportunity type, used on every card and list. */
const categories: Record<string, CategoryStyle> = {
  scholarship: { icon: GraduationCap, tint: "bg-verified-muted text-verified" },
  training: { icon: BookOpen, tint: "bg-primary-muted text-primary" },
  apprenticeship: { icon: Wrench, tint: "bg-sun-muted text-warning" },
  employment: { icon: Briefcase, tint: "bg-surface-muted text-foreground" },
  local_work: { icon: HardHat, tint: "bg-highlight-muted text-highlight" },
  contract: { icon: HardHat, tint: "bg-highlight-muted text-highlight" },
};

const fallback: CategoryStyle = { icon: Briefcase, tint: "bg-surface-muted text-foreground" };

export function categoryStyle(type: string): CategoryStyle {
  return categories[type] ?? fallback;
}

export function CategoryIcon({
  type,
  size = "md",
  className,
}: {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { icon: Icon, tint } = categoryStyle(type);
  const box = { sm: "size-8 rounded-[9px]", md: "size-10 rounded-xl", lg: "size-12 rounded-[14px]" }[size];
  const glyph = { sm: "size-4", md: "size-[1.15rem]", lg: "size-5" }[size];
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center", box, tint, className)}>
      <Icon className={glyph} />
    </span>
  );
}
