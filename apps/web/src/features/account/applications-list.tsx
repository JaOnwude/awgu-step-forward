"use client";

import Link from "next/link";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { ApplicationStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isTracked } from "@/lib/api/applications";
import { formatWatDate } from "@/lib/format";

import { useApplications } from "./queries";

export function ApplicationsList() {
  const applicationsQuery = useApplications();
  const rows = applicationsQuery.data ?? [];

  return (
    <Card id="applications" className="scroll-mt-24">
      <CardHeader>
        <h2 className="text-lg font-bold">Your applications</h2>
      </CardHeader>
      <CardContent>
        {applicationsQuery.isPending ? (
          <ListSkeleton rows={2} label="Loading your applications…" />
        ) : applicationsQuery.isError ? (
          <ErrorState
            error={applicationsQuery.error}
            onRetry={() => applicationsQuery.refetch()}
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven’t applied to anything yet. When you apply in-platform, your
            receipt and status updates appear here.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
              >
                <div>
                  <Link
                    href={`/account/applications/${row.id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.opportunity_title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {isTracked(row)
                      ? `${row.route === "in_person" ? "In person" : "Provider’s site"} · tracked by you`
                      : `Reference ${row.reference}${
                          row.submitted_at
                            ? ` · submitted ${formatWatDate(row.submitted_at) ?? ""}`
                            : " · draft"
                        }`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ApplicationStatusBadge status={row.status} />
                  {isTracked(row) ? <StatusBadge tone="outline">Reported by you</StatusBadge> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
