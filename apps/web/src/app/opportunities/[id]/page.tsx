import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  fetchOpportunityDetail,
  type OpportunityDetail,
} from "@/lib/api/discovery";
import { formatWatDate, formatWatDateTime } from "@/lib/format";
import {
  applicationRouteLabel,
  deliveryModeLabel,
  opportunityTypeLabel,
} from "@/lib/opportunity-labels";
import { ListingStatusBadge, StatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { SaveListingButton } from "@/features/discovery/save-listing-button";
import { ADULT_ONLY_TYPES } from "@/lib/api/opportunities";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const opportunity = await fetchOpportunityDetail(id);
    if (!opportunity) return { title: "Opportunity — Awgu StepForward" };
    return {
      title: `${opportunity.title} — Awgu StepForward`,
      description: opportunity.description.slice(0, 160),
    };
  } catch {
    return { title: "Opportunity — Awgu StepForward" };
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

export default async function OpportunityPage({ params }: { params: Params }) {
  const { id } = await params;

  let opportunity: OpportunityDetail | null = null;
  let failed = false;
  try {
    opportunity = await fetchOpportunityDetail(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <Link href="/opportunities" className="text-sm font-medium text-primary hover:underline">
          ← Back to opportunities
        </Link>
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-danger/40 bg-danger/5 p-6"
        >
          <h1 className="font-medium">We couldn’t load this listing.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The directory service did not respond. Please try again.
          </p>
        </div>
      </section>
    );
  }

  if (!opportunity) notFound();

  const deadline = formatWatDateTime(opportunity.deadline_at);
  const reviewed = formatWatDate(opportunity.reviewed_at);
  const updated = formatWatDate(opportunity.updated_at);
  const provider = opportunity.provider;
  const terms = opportunity.work_terms;
  const isWork =
    ADULT_ONLY_TYPES.includes(opportunity.opportunity_type) ||
    Boolean(terms?.adult_only_construction);

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-12">
      <Link
        href="/opportunities"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Back to opportunities
      </Link>

      <header className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {provider ? <VerificationBadge status={provider.verification_status} /> : null}
          {opportunity.is_expired ? (
            <ListingStatusBadge status="expired" />
          ) : opportunity.is_closing_soon ? (
            <StatusBadge tone="warning">Closing soon</StatusBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {opportunity.title}
        </h1>
        <p className="text-muted-foreground">
          {provider?.name ?? "Unknown provider"} · {opportunity.location} ·{" "}
          {opportunityTypeLabel(opportunity.opportunity_type)}
        </p>
      </header>

      {opportunity.is_expired ? (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm"
        >
          <strong className="font-medium">This listing has expired.</strong> It
          is kept for reference and no longer appears in default results. Check
          for similar active opportunities.
        </div>
      ) : null}

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium">About this opportunity</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {opportunity.description}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Key details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Category" value={opportunityTypeLabel(opportunity.opportunity_type)} />
          <DetailItem label="Location" value={opportunity.location} />
          <DetailItem label="Delivery mode" value={deliveryModeLabel(opportunity.delivery_mode)} />
          <DetailItem label="How to apply" value={applicationRouteLabel(opportunity.application_route)} />
          <DetailItem label="Eligibility" value={opportunity.eligibility} />
          <DetailItem
            label="Minimum age"
            value={opportunity.min_age ? `${opportunity.min_age}+` : null}
          />
          <DetailItem label="Costs" value={opportunity.cost_details} />
          <DetailItem label="Stipend / pay" value={opportunity.pay_details} />
          <DetailItem
            label="Deadline"
            value={deadline ? `${deadline} (WAT, Africa/Lagos)` : null}
          />
        </dl>
      </section>

      {isWork ? (
        <Alert className="mt-8">
          <ShieldAlert aria-hidden />
          <AlertTitle>Adults only (18+)</AlertTitle>
          <AlertDescription>
            {terms?.adult_only_construction
              ? "This is construction-site work. It is open to verified adults aged 18 and over only."
              : "Paid work listings are open to adults aged 18 and over only."}{" "}
            Never pay to apply, and report a listing if anything feels unsafe.
          </AlertDescription>
        </Alert>
      ) : null}

      {terms ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Work terms and safety</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem label="Task and scope" value={terms.task_scope ?? "Not stated"} />
            <DetailItem label="Pay" value={terms.pay_rate ?? "Not stated"} />
            <DetailItem label="When pay is made" value={terms.payment_timing ?? "Not stated"} />
            <DetailItem label="Expected hours" value={terms.hours_expected ?? "Not stated"} />
            <DetailItem label="Work dates" value={terms.work_dates ?? "Not stated"} />
            <DetailItem label="Worksite area" value={terms.worksite ?? "Not stated"} />
            <DetailItem
              label="Supervisor / contact"
              value={terms.supervisor_contact ?? "Not stated"}
            />
            <DetailItem
              label="Site hazards reviewed"
              value={terms.hazards_reviewed ? "Yes" : "Not confirmed"}
            />
          </dl>
          <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Safety and PPE
            </p>
            <p className="mt-1 text-sm whitespace-pre-line">
              {terms.safety_ppe ?? "Not stated — ask the provider before starting work."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Provider &amp; freshness</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Provider" value={provider?.name ?? "Unknown"} />
          <DetailItem
            label="Verification"
            value={provider ? `${provider.verification_status}` : null}
          />
          <DetailItem
            label="Verified on"
            value={provider ? formatWatDate(provider.verified_at) : null}
          />
          <DetailItem label="Contact" value={provider?.public_contact} />
          <DetailItem label="Listing reviewed" value={reviewed} />
          <DetailItem label="Last updated" value={updated} />
        </dl>
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-3">
        {opportunity.application_route === "platform" && !opportunity.is_expired ? (
          <Link href={`/opportunities/${opportunity.id}/apply`} className={buttonVariants()}>
            Apply in-platform
          </Link>
        ) : opportunity.external_url && !opportunity.is_expired ? (
          <a
            href={opportunity.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            Apply on provider site
          </a>
        ) : (
          <span className={buttonVariants({ className: "pointer-events-none opacity-70" })}>
            {opportunity.is_expired ? "Applications closed" : "Apply in person"}
          </span>
        )}
        {!opportunity.is_expired ? (
          <SaveListingButton opportunityId={opportunity.id} />
        ) : null}
        <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>
          Browse more
        </Link>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Verification means a staff member reviewed the provider. It is not a
        government endorsement or a guarantee of a place. Never send payment or
        personal documents that a listing did not ask for.
      </p>
    </article>
  );
}
