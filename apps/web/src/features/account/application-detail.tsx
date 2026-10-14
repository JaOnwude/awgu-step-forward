"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ErrorState,
  InlineError,
  SectionSkeleton,
} from "@/components/shared/query-states";
import {
  ApplicationStatusBadge,
  applicationStatusMeta,
  applicationStatusSourceLabels,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUnauthorized } from "@/lib/api/errors";
import { formatWatDateTime } from "@/lib/format";

import { useApplication, useWithdrawApplication } from "./queries";

const WITHDRAWABLE = new Set(["draft", "submitted", "under_review"]);

export function ApplicationDetailView({ id }: { id: string }) {
  const applicationQuery = useApplication(id);
  const withdraw = useWithdrawApplication(id);
  const [withdrawNote, setWithdrawNote] = useState("");

  if (applicationQuery.isPending) {
    return <SectionSkeleton label="Loading application…" />;
  }

  if (applicationQuery.isError) {
    return (
      <ErrorState
        title="We couldn’t load this application"
        error={applicationQuery.error}
        onRetry={
          isUnauthorized(applicationQuery.error)
            ? undefined
            : () => applicationQuery.refetch()
        }
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/account">
            {isUnauthorized(applicationQuery.error)
              ? "Sign in on your account page"
              : "Back to your account"}
          </Link>
        </Button>
      </ErrorState>
    );
  }

  const application = applicationQuery.data;
  const canWithdraw = WITHDRAWABLE.has(application.status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Reference {application.reference}</p>
          <h2 className="text-xl font-medium">{application.opportunity_title}</h2>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Status history</h3>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {application.history.map((event, index) => (
              <li key={`${event.to_status}-${index}`} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                />
                <div>
                  <p className="text-sm font-medium">
                    {applicationStatusMeta[event.to_status]?.label ?? event.to_status}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {applicationStatusSourceLabels[event.source] ?? event.source}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWatDateTime(event.created_at) ?? ""}
                  </p>
                  {event.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Your answers</h3>
        </CardHeader>
        <CardContent>
          {application.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers were saved.</p>
          ) : (
            <dl className="grid gap-4">
              {application.answers.map((answer) => (
                <div key={answer.question_key}>
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {answer.question_key}
                  </dt>
                  <dd className="mt-1 text-sm whitespace-pre-line">
                    {answer.answer_value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      {canWithdraw ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Withdraw application</h3>
            <CardDescription>
              Withdrawing tells the provider you are no longer applying. You can
              apply again later if the listing is still open.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="withdraw-note">Reason (optional)</Label>
              <Input
                id="withdraw-note"
                value={withdrawNote}
                onChange={(event) => setWithdrawNote(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              className="w-fit"
              onClick={() => withdraw.mutate(withdrawNote.trim() || undefined)}
              disabled={withdraw.isPending}
            >
              Withdraw application
            </Button>
            <InlineError error={withdraw.error} />
          </CardContent>
        </Card>
      ) : null}

      {withdraw.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          Application withdrawn.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/account">Back to your account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/opportunities/${application.opportunity_id}`}>View listing</Link>
        </Button>
      </div>
    </div>
  );
}
