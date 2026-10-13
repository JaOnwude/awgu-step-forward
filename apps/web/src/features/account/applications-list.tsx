"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listApplications, type ApplicationSummary } from "@/lib/api/applications";
import { describeApiError } from "@/lib/api/errors";
import { formatWatDate } from "@/lib/format";
import { ApplicationStatusBadge } from "@/components/shared/status-badge";

export function ApplicationsList() {
  const [rows, setRows] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listApplications();
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

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-medium">Your applications</h2>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          You haven’t applied to anything yet. When you apply in-platform, your
          receipt and status updates appear here.
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
                  href={`/account/applications/${row.id}`}
                  className="font-medium hover:underline"
                >
                  {row.opportunity_title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Reference {row.reference}
                  {row.submitted_at
                    ? ` · submitted ${formatWatDate(row.submitted_at) ?? ""}`
                    : " · draft"}
                </p>
              </div>
              <ApplicationStatusBadge status={row.status} />
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
