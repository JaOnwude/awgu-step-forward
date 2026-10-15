import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDashed,
  Clock,
  HardHat,
  Info,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { DetailSkeleton } from "@/components/shared/detail-skeleton";
import { CategoryIcon } from "@/components/shared/category-icon";
import { categoryImage } from "@/lib/images";
import {
  AdultsOnlyBadge,
  ListingStatusBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { ExternalApply } from "@/features/discovery/external-apply";
import { SaveListingButton } from "@/features/discovery/save-listing-button";
import { ReportDialog } from "@/features/reports/report-dialog";
import { fetchOpportunityDetail, type OpportunityDetail } from "@/lib/api/discovery";
import { ADULT_ONLY_TYPES } from "@/lib/api/opportunities";
import { formatWatDate, formatWatDateTime } from "@/lib/format";
import {
  applicationRouteLabel,
  deliveryModeLabel,
  opportunityTypeLabel,
} from "@/lib/opportunity-labels";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
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

function FactCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <div className="grid content-start gap-1.5 rounded-2xl border bg-card p-5">
      <Icon aria-hidden className="size-5 text-primary" />
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="text-lg leading-snug font-bold">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 border-b border-dashed py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{value}</dd>
    </div>
  );
}

function SafetyItem({ ok, title, note }: { ok: boolean; title: string; note: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
          ok ? "bg-success-muted text-success" : "bg-muted text-muted-foreground"
        }`}
      >
        {ok ? <Check aria-hidden className="size-4" /> : <CircleDashed aria-hidden className="size-4" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
    </li>
  );
}

function ApplyAction({ opportunity }: { opportunity: OpportunityDetail }) {
  if (opportunity.is_expired) {
    return (
      <span className={buttonVariants({ size: "lg", variant: "secondary", className: "pointer-events-none w-full" })}>
        Applications closed
      </span>
    );
  }
  if (opportunity.application_route === "platform") {
    return (
      <Link href={`/opportunities/${opportunity.id}/apply`} className={buttonVariants({ size: "lg", className: "w-full" })}>
        Apply in-platform <ArrowRight aria-hidden />
      </Link>
    );
  }
  // Provider site or in person: the applicant can track it themselves.
  return (
    <ExternalApply
      opportunityId={opportunity.id}
      externalUrl={opportunity.external_url}
      inPerson={opportunity.application_route === "in_person"}
    />
  );
}

async function OpportunityContent({ params }: { params: Params }) {
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
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-muted p-6">
          <h1 className="font-semibold">We couldn’t load this listing.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The directory service did not respond. Please try again.
          </p>
          <Link href="/opportunities" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            Back to opportunities
          </Link>
        </div>
      </section>
    );
  }

  if (!opportunity) notFound();

  const deadline = formatWatDate(opportunity.deadline_at);
  const deadlineTime = formatWatDateTime(opportunity.deadline_at);
  const provider = opportunity.provider;
  const terms = opportunity.work_terms;
  const isWork =
    ADULT_ONLY_TYPES.includes(opportunity.opportunity_type) || Boolean(terms?.adult_only_construction);
  const money = opportunity.pay_details ?? terms?.pay_rate ?? opportunity.cost_details;

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft aria-hidden className="size-4" /> All opportunities
      </Link>

      <div className="mt-5 grid items-start gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="grid gap-8">
          <header className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {provider ? (
                <VerificationBadge
                  status={provider.verification_status}
                  label={isWork && provider.verification_status === "verified" ? "Verified employer" : undefined}
                />
              ) : null}
              {isWork ? <AdultsOnlyBadge /> : null}
              {opportunity.is_expired ? (
                <ListingStatusBadge status="expired" />
              ) : opportunity.is_closing_soon ? (
                <StatusBadge tone="warning" icon={Clock}>
                  Closing soon
                </StatusBadge>
              ) : null}
              <StatusBadge tone="primary" icon={MapPin}>
                {opportunity.location}
              </StatusBadge>
            </div>
            <h1 className="font-display text-4xl leading-[1.08] font-semibold sm:text-5xl">
              {opportunity.title}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <CategoryIcon type={opportunity.opportunity_type} size="sm" />
              {provider?.name ?? "Unknown provider"} · {opportunityTypeLabel(opportunity.opportunity_type)}
              {opportunity.reviewed_at ? ` · Reviewed ${formatWatDate(opportunity.reviewed_at)}` : ""}
            </p>
          </header>

          <Image
            src={categoryImage(opportunity.opportunity_type).src}
            width={1200}
            height={800}
            alt=""
            loading="eager"
            sizes="(min-width: 1024px) 44rem, 100vw"
            className="aspect-[5/2] w-full rounded-3xl object-cover"
          />

          {opportunity.is_expired ? (
            <Alert>
              <Clock aria-hidden />
              <AlertTitle>This listing has closed</AlertTitle>
              <AlertDescription>
                It is kept here so you can follow an application you already made. It no
                longer appears in search results.
              </AlertDescription>
            </Alert>
          ) : null}

          {isWork ? (
            <div className="flex gap-3 rounded-2xl border border-highlight/35 bg-highlight-muted p-4">
              <HardHat aria-hidden className="mt-0.5 size-5 shrink-0 text-highlight" />
              <div className="text-sm">
                <p className="font-bold">Adults only (18+)</p>
                <p>
                  {terms?.adult_only_construction
                    ? "This is construction-site work, open to verified adults only."
                    : "Paid work listings are open to verified adults only."}{" "}
                  Never pay anyone to get this job — report it if they ask.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <FactCard
              icon={Banknote}
              label={isWork || opportunity.pay_details ? "Pay" : "Cost"}
              value={money ?? "Not stated"}
              note={terms?.payment_timing}
            />
            <FactCard
              icon={CalendarDays}
              label={isWork ? "Dates & hours" : "Format"}
              value={isWork ? (terms?.work_dates ?? "Not stated") : deliveryModeLabel(opportunity.delivery_mode)}
              note={isWork ? terms?.hours_expected : applicationRouteLabel(opportunity.application_route)}
            />
            <FactCard
              icon={MapPin}
              label={isWork ? "Worksite" : "Where"}
              value={(isWork ? terms?.worksite : null) ?? opportunity.location}
              note={isWork ? "Exact spot shared after you’re accepted" : null}
            />
          </div>

          <section className="grid gap-3">
            <h2 className="font-display text-3xl font-semibold">
              {isWork ? "The work" : "About this opportunity"}
            </h2>
            <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
              {terms?.task_scope ?? opportunity.description}
            </p>
            {terms?.task_scope ? (
              <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                {opportunity.description}
              </p>
            ) : null}
          </section>

          {terms ? (
            <section className="grid gap-4 rounded-2xl border bg-card p-6">
              <h2 className="text-xl font-bold">Safety &amp; supervision</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                <SafetyItem
                  ok={Boolean(terms.safety_ppe)}
                  title="Safety gear (PPE)"
                  note={terms.safety_ppe ?? "Not stated — ask before starting work"}
                />
                <SafetyItem
                  ok={terms.hazards_reviewed}
                  title="Site hazards reviewed"
                  note={terms.hazards_reviewed ? "Confirmed by the employer" : "Not yet confirmed"}
                />
                <SafetyItem
                  ok={Boolean(terms.supervisor_contact)}
                  title="Named supervisor"
                  note={terms.supervisor_contact ?? "Not stated"}
                />
                <SafetyItem
                  ok={Boolean(terms.payment_timing)}
                  title="Clear pay timing"
                  note={terms.payment_timing ?? "Not stated"}
                />
              </ul>
            </section>
          ) : null}

          <section className="grid gap-2">
            <h2 className="text-xl font-bold">Details</h2>
            <dl className="rounded-2xl border bg-card px-5">
              <Detail label="Eligibility" value={opportunity.eligibility} />
              <Detail label="Minimum age" value={opportunity.min_age ? `${opportunity.min_age}+` : null} />
              <Detail label="Costs" value={opportunity.cost_details} />
              <Detail label="Stipend / pay" value={opportunity.pay_details} />
              <Detail label="Delivery" value={deliveryModeLabel(opportunity.delivery_mode)} />
              <Detail label="How to apply" value={applicationRouteLabel(opportunity.application_route)} />
              <Detail label="Last updated" value={formatWatDate(opportunity.updated_at)} />
            </dl>
          </section>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-24">
          <div className="grid gap-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow text-muted-foreground">Apply by</p>
              {opportunity.is_closing_soon && !opportunity.is_expired ? (
                <StatusBadge tone="warning" icon={Clock}>
                  Closing soon
                </StatusBadge>
              ) : null}
            </div>
            <div>
              <p className="font-display text-3xl font-semibold">{deadline ?? "No fixed deadline"}</p>
              {deadlineTime ? (
                <p className="text-xs text-muted-foreground">{deadlineTime} West Africa Time</p>
              ) : null}
            </div>
            <hr />
            <ApplyAction opportunity={opportunity} />
            {!opportunity.is_expired ? <SaveListingButton opportunityId={opportunity.id} /> : null}
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Applying is always free. You’ll see exactly what is shared before anything
              is sent.
            </p>
          </div>

          {provider ? (
            <div className="grid gap-3 rounded-2xl border bg-card p-6">
              <p className="text-sm font-bold">About the {isWork ? "employer" : "provider"}</p>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-highlight-muted font-display text-lg font-semibold text-highlight">
                  {provider.name
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word.charAt(0))
                    .join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {provider.verified_at ? `Verified ${formatWatDate(provider.verified_at)}` : "Not yet verified"}
                  </p>
                </div>
              </div>
              {provider.public_contact ? (
                <p className="text-sm text-muted-foreground">Contact: {provider.public_contact}</p>
              ) : null}
              <ReportDialog targetType="opportunity" targetId={opportunity.id} />
            </div>
          ) : (
            <ReportDialog targetType="opportunity" targetId={opportunity.id} />
          )}

          <p className="px-1 text-xs text-muted-foreground">
            Verification means our team reviewed this provider. It is not a government
            endorsement or a guaranteed place.
          </p>
        </div>
      </div>
    </article>
  );
}

// The data (and the URL id) load inside Suspense, so the page shell and a
// skeleton can be sent instantly while the content streams in.
export default function OpportunityPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton label="Loading opportunity…" />}>
      <OpportunityContent params={params} />
    </Suspense>
  );
}
