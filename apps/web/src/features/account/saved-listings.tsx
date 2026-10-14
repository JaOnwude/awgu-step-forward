"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listSaved, unsaveListing, type SavedListing } from "@/lib/api/applicant";
import { describeApiError } from "@/lib/api/errors";
import { formatWatDate } from "@/lib/format";
import { opportunityTypeLabel } from "@/lib/opportunity-labels";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { secondaryButton } from "@/lib/ui";

export function SavedListings() {
  const [rows, setRows] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listSaved();
        if (active) setRows(data);
      } catch (caught) {
        if (active) setError(describeApiError(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleRemove(opportunityId: string) {
    setBusyId(opportunityId);
    setError("");
    try {
      await unsaveListing(opportunityId);
      setRows((current) =>
        current.filter((row) => row.opportunity_id !== opportunityId),
      );
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-medium">Saved opportunities</h2>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing saved yet. Browse the{" "}
          <Link href="/opportunities" className="font-medium text-primary">
            opportunity directory
          </Link>{" "}
          and save listings to review later.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div>
                <Link
                  href={`/opportunities/${row.opportunity_id}`}
                  className="font-medium hover:underline"
                >
                  {row.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {opportunityTypeLabel(row.opportunity_type)} · {row.location} ·
                  saved {formatWatDate(row.saved_at) ?? "recently"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {row.is_expired ? <ListingStatusBadge status="expired" /> : null}
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => handleRemove(row.opportunity_id)}
                  disabled={busyId === row.opportunity_id}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
