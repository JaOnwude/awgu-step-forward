import Link from "next/link";

import type { OpportunityCard } from "@/lib/api/discovery";
import { formatWatDateTime } from "@/lib/format";
import {
  deliveryModeLabel,
  opportunityTypeLabel,
} from "@/lib/opportunity-labels";
import { ListingStatusBadge, StatusBadge, VerificationBadge } from "@/components/shared/status-badge";

export function OpportunityCardView({
  opportunity,
}: {
  opportunity: OpportunityCard;
}) {
  const deadline = formatWatDateTime(opportunity.deadline_at);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {opportunity.provider ? (
          <VerificationBadge status={opportunity.provider.verification_status} />
        ) : null}
        {opportunity.is_expired ? (
          <ListingStatusBadge status="expired" />
        ) : opportunity.is_closing_soon ? (
          <StatusBadge tone="warning">Closing soon</StatusBadge>
        ) : null}
      </div>

      <h3 className="text-lg font-medium">
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {opportunity.title}
        </Link>
      </h3>

      <p className="text-sm text-muted-foreground">
        {opportunity.provider?.name ?? "Unknown provider"} · {opportunity.location}
      </p>

      <dl className="mt-auto grid gap-1 text-sm text-muted-foreground">
        <div className="flex gap-1">
          <dt className="sr-only">Category</dt>
          <dd>{opportunityTypeLabel(opportunity.opportunity_type)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Delivery mode</dt>
          <dd>{deliveryModeLabel(opportunity.delivery_mode)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Deadline</dt>
          <dd>
            {deadline
              ? `Closes ${deadline} (WAT)`
              : "No fixed deadline"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
