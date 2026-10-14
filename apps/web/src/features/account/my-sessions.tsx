"use client";

import Link from "next/link";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
} from "@/components/shared/query-states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  useCancelSessionRegistration,
  useMySessionRegistrations,
} from "@/features/sessions/queries";
import { type MySessionRegistration, sessionDeliveryLabel } from "@/lib/api/sessions";
import { formatWatDateTime } from "@/lib/format";

function RegistrationRow({ row }: { row: MySessionRegistration }) {
  const cancel = useCancelSessionRegistration(row.session_id);
  const active = row.status === "registered";

  return (
    <li className="grid gap-2 rounded-xl border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/sessions/${row.session_id}`} className="font-medium hover:underline">
            {row.session.topic}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatWatDateTime(row.session.starts_at)} WAT ·{" "}
            {sessionDeliveryLabel(row.session.delivery_mode)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {active ? (
            <StatusBadge tone="success">Registered</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Cancelled</StatusBadge>
          )}
          {active && !row.session.has_started ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              Cancel place
            </Button>
          ) : null}
        </div>
      </div>
      <InlineError error={cancel.error} />
    </li>
  );
}

export function MySessions() {
  const query = useMySessionRegistrations();
  const rows = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Your support sessions</h2>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <ListSkeleton rows={1} label="Loading your sessions…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven’t registered for a session. Free{" "}
            <Link href="/sessions" className="font-medium text-primary">
              application support sessions
            </Link>{" "}
            can help you prepare.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => (
              <RegistrationRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
