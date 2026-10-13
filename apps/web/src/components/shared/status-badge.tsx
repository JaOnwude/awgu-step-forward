import type { ReactNode } from "react";

export type Tone =
  | "neutral"
  | "verified"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "primary";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-surface-muted text-muted-foreground",
  verified: "border-verified/30 bg-verified/10 text-verified",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  accent: "border-accent/30 bg-accent/10 text-accent",
  primary: "border-primary/30 bg-primary-muted text-primary",
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const verificationMeta: Record<string, { tone: Tone; label: string }> = {
  pending: { tone: "warning", label: "Pending verification" },
  verified: { tone: "verified", label: "Verified provider" },
  rejected: { tone: "danger", label: "Verification rejected" },
  suspended: { tone: "danger", label: "Provider suspended" },
};

export function VerificationBadge({ status }: { status: string }) {
  const meta = verificationMeta[status] ?? {
    tone: "neutral" as Tone,
    label: status,
  };
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

const listingMeta: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  pending_review: { tone: "warning", label: "In review" },
  changes_requested: { tone: "accent", label: "Changes requested" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  suspended: { tone: "danger", label: "Suspended" },
  expired: { tone: "neutral", label: "Expired" },
};

export function ListingStatusBadge({ status }: { status: string }) {
  const meta = listingMeta[status] ?? {
    tone: "neutral" as Tone,
    label: status,
  };
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export const applicationStatusMeta: Record<
  string,
  { tone: Tone; label: string }
> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "primary", label: "Submitted" },
  under_review: { tone: "warning", label: "Under review" },
  interview: { tone: "accent", label: "Interview" },
  offered: { tone: "success", label: "Offered" },
  accepted: { tone: "success", label: "Accepted" },
  rejected: { tone: "danger", label: "Not successful" },
  withdrawn: { tone: "neutral", label: "Withdrawn" },
  closed: { tone: "neutral", label: "Closed" },
};

export function applicationStatusLabel(status: string): string {
  return applicationStatusMeta[status]?.label ?? status;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const meta = applicationStatusMeta[status] ?? {
    tone: "neutral" as Tone,
    label: status,
  };
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export const applicationStatusSourceLabels: Record<string, string> = {
  applicant: "You",
  provider: "Provider",
  staff: "Support team",
};
