"use client";

import Link from "next/link";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
} from "@/components/shared/query-states";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatWatDate } from "@/lib/format";
import { opportunityTypeLabel } from "@/lib/opportunity-labels";

import { useSaveListing, useSavedListings } from "./queries";

export function SavedListings() {
  const savedQuery = useSavedListings();
  const toggle = useSaveListing();
  const rows = savedQuery.data ?? [];

  return (
    <Card id="saved" className="scroll-mt-24">
      <CardHeader>
        <h2 className="text-lg font-bold">Saved opportunities</h2>
      </CardHeader>
      <CardContent className="grid gap-3">
        {savedQuery.isPending ? (
          <ListSkeleton rows={2} label="Loading saved opportunities…" />
        ) : savedQuery.isError ? (
          <ErrorState error={savedQuery.error} onRetry={() => savedQuery.refetch()} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Browse the{" "}
            <Link href="/opportunities" className="font-medium text-primary">
              opportunity directory
            </Link>{" "}
            and save listings to review later.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <CategoryIcon type={row.opportunity_type} />
                  <div className="min-w-0">
                    <Link
                      href={`/opportunities/${row.opportunity_id}`}
                      className="font-semibold hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {opportunityTypeLabel(row.opportunity_type)} · {row.location} · saved{" "}
                      {formatWatDate(row.saved_at) ?? "recently"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {row.is_expired ? <ListingStatusBadge status="expired" /> : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggle.mutate({ opportunityId: row.opportunity_id, saved: true })
                    }
                    disabled={
                      toggle.isPending &&
                      toggle.variables?.opportunityId === row.opportunity_id
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <InlineError error={toggle.error} />
      </CardContent>
    </Card>
  );
}
