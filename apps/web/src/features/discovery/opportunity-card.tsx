import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import {
  AdultsOnlyBadge,
  ListingStatusBadge,
  ListingTrustBadge,
  StatusBadge,
} from "@/components/shared/status-badge";
import type { OpportunityCard } from "@/lib/api/discovery";
import { ADULT_ONLY_TYPES } from "@/lib/api/opportunities";
import { formatWatDate } from "@/lib/format";
import { listingImage } from "@/lib/images";
import { deliveryModeLabel, opportunityTypeLabel } from "@/lib/opportunity-labels";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[0.7rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-[0.9rem] font-semibold">{value}</dd>
    </div>
  );
}

export function OpportunityCardView({
  opportunity,
}: {
  opportunity: OpportunityCard;
}) {
  const deadline = formatWatDate(opportunity.deadline_at);
  const isWork = ADULT_ONLY_TYPES.includes(opportunity.opportunity_type);
  const showsPay = isWork || Boolean(opportunity.pay_details);
  const moneyValue =
    (showsPay ? opportunity.pay_details : opportunity.cost_details) ?? "Not stated";
  const image = listingImage(opportunity);

  return (
    <article className="group relative grid gap-4 overflow-hidden rounded-2xl border bg-card p-5 pt-0 shadow-xs transition-all duration-300 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]">
      {/* Decorative; lazy-loaded because most cards sit below the fold. */}
      <div className="-mx-5 overflow-hidden">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          sizes="(min-width: 1024px) 24rem, (min-width: 768px) 50vw, 100vw"
          className="aspect-[2/1] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex items-center gap-2.5 text-[0.8rem] font-semibold text-muted-foreground">
        <CategoryIcon type={opportunity.opportunity_type} size="sm" />
        {opportunityTypeLabel(opportunity.opportunity_type)}
      </div>

      <div className="grid gap-1.5">
        <h3 className="font-display text-[1.3rem] leading-tight font-semibold">
          {/* The whole card is clickable through this stretched link. */}
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {opportunity.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {opportunity.provider?.name ?? "Unknown provider"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ListingTrustBadge listing={opportunity} verifiedLabel="Verified" />
        {isWork ? <AdultsOnlyBadge short /> : null}
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

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-dashed pt-4">
        <Fact label={showsPay ? "Pay" : "Cost"} value={moneyValue} />
        <Fact label={opportunity.is_expired ? "Closed" : "Apply by"} value={deadline ?? "Open"} />
        <div className="sr-only">
          <dt>Delivery</dt>
          <dd>{deliveryModeLabel(opportunity.delivery_mode)}</dd>
        </div>
      </dl>
    </article>
  );
}
