import type { ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Clock,
  Eye,
  HardHat,
  MessageSquareWarning,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type Tone =
  | "neutral"
  | "verified"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "primary"
  | "outline";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  verified: "bg-verified-muted text-verified",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  accent: "bg-highlight-muted text-highlight",
  primary: "bg-primary-muted text-primary",
  outline: "border-border text-muted-foreground",
};

/**
 * Status pill. Meaning never relies on colour alone: every badge has words,
 * and status badges also carry an icon (spec R53).
 */
export function StatusBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[1.625rem] w-fit shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-[0.78rem] font-semibold whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  );
}

interface Meta {
  tone: Tone;
  label: string;
  icon?: LucideIcon;
}

const verificationMeta: Record<string, Meta> = {
  pending: { tone: "warning", label: "Pending verification", icon: Clock },
  verified: { tone: "verified", label: "Verified provider", icon: ShieldCheck },
  rejected: { tone: "danger", label: "Verification rejected", icon: AlertTriangle },
  suspended: { tone: "danger", label: "Provider suspended", icon: AlertTriangle },
};

export function VerificationBadge({
  status,
  label,
}: {
  status: string;
  /** Override the default wording, e.g. "Verified employer". */
  label?: string;
}) {
  const meta = verificationMeta[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <StatusBadge tone={meta.tone} icon={meta.icon}>
      {label ?? meta.label}
    </StatusBadge>
  );
}

const listingMeta: Record<string, Meta> = {
  draft: { tone: "neutral", label: "Draft", icon: CircleDashed },
  pending_review: { tone: "warning", label: "In review", icon: Eye },
  changes_requested: { tone: "accent", label: "Changes requested", icon: MessageSquareWarning },
  approved: { tone: "success", label: "Approved", icon: Check },
  rejected: { tone: "danger", label: "Rejected", icon: AlertTriangle },
  suspended: { tone: "danger", label: "Suspended", icon: AlertTriangle },
  expired: { tone: "neutral", label: "Expired", icon: Clock },
};

export function ListingStatusBadge({ status }: { status: string }) {
  const meta = listingMeta[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <StatusBadge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </StatusBadge>
  );
}

export const applicationStatusMeta: Record<string, Meta> = {
  draft: { tone: "neutral", label: "Draft", icon: CircleDashed },
  submitted: { tone: "primary", label: "Submitted", icon: Check },
  under_review: { tone: "warning", label: "Under review", icon: Eye },
  interview: { tone: "accent", label: "Interview", icon: MessageSquareWarning },
  offered: { tone: "success", label: "Offered", icon: Check },
  accepted: { tone: "success", label: "Accepted", icon: Check },
  rejected: { tone: "danger", label: "Not successful", icon: AlertTriangle },
  withdrawn: { tone: "neutral", label: "Withdrawn", icon: CircleDashed },
  closed: { tone: "neutral", label: "Closed", icon: Clock },
};

export function applicationStatusLabel(status: string): string {
  return applicationStatusMeta[status]?.label ?? status;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const meta = applicationStatusMeta[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <StatusBadge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </StatusBadge>
  );
}

/** Adults-only marker for work listings (spec R22a). */
export function AdultsOnlyBadge({ short = false }: { short?: boolean }) {
  return (
    <StatusBadge tone="accent" icon={HardHat}>
      {short ? "18+" : "Adults only · 18+"}
    </StatusBadge>
  );
}

export const applicationStatusSourceLabels: Record<string, string> = {
  applicant: "You",
  provider: "Provider",
  staff: "Support team",
};
