import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The StepForward mark: three rising steps toward a morning sun
 * (DECISIONS D21). Colours come from tokens so it adapts to dark mode.
 */
export function LogoMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect width="40" height="40" rx="11" fill="var(--primary)" />
      <rect x="7.5" y="24" width="7" height="8.5" rx="1.6" fill="var(--primary-foreground)" />
      <rect x="16.5" y="18" width="7" height="14.5" rx="1.6" fill="var(--primary-foreground)" />
      <rect x="25.5" y="12" width="7" height="20.5" rx="1.6" fill="var(--primary-foreground)" />
      <circle cx="14" cy="11.5" r="4" fill="var(--sun)" />
    </svg>
  );
}

/** Mark + stacked wordmark. `label` replaces "AWGU" (e.g. "STAFF"). */
export function Logo({
  href = "/",
  label = "AWGU",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="Awgu StepForward home"
    >
      <LogoMark />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className="text-[0.6rem] font-bold tracking-[0.22em] text-highlight">
          {label}
        </span>
        <span className="font-display text-xl font-semibold">StepForward</span>
      </span>
    </Link>
  );
}
