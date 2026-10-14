"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchApplication,
  withdrawApplication,
  type ApplicationDetail,
} from "@/lib/api/applications";
import { describeApiError, isUnauthorized } from "@/lib/api/errors";
import { formatWatDateTime } from "@/lib/format";
import {
  ApplicationStatusBadge,
  applicationStatusMeta,
  applicationStatusSourceLabels,
} from "@/components/shared/status-badge";
import { dangerButton, inputClass, primaryButton, secondaryButton } from "@/lib/ui";

const WITHDRAWABLE = new Set(["draft", "submitted", "under_review"]);

export function ApplicationDetailView({ id }: { id: string }) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchApplication(id);
        if (active) setApplication(data);
      } catch (caught) {
        if (active) {
          if (isUnauthorized(caught)) {
            setError("Please sign in to view this application.");
          } else {
            setError(describeApiError(caught));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleWithdraw() {
    if (!application) return;
    setBusy(true);
    setError("");
    try {
      const updated = await withdrawApplication(
        application.id,
        withdrawNote.trim() || undefined,
      );
      setApplication(updated);
      setNotice("Application withdrawn.");
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading application…</p>;
  }

  if (error && !application) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/5 p-6">
        <p className="font-medium">We couldn’t load this application.</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Link href="/account" className={`mt-4 inline-block ${secondaryButton}`}>
          Back to your account
        </Link>
      </div>
    );
  }

  if (!application) return null;

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

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-medium">Status history</h3>
        <ol className="mt-4 space-y-4">
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
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-medium">Your answers</h3>
        {application.answers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No answers were saved.
          </p>
        ) : (
          <dl className="mt-4 grid gap-4">
            {application.answers.map((answer) => (
              <div key={answer.question_key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {answer.question_key}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm">
                  {answer.answer_value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {canWithdraw ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-lg font-medium">Withdraw application</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Withdrawing tells the provider you are no longer applying. You can
            apply again later if the listing is still open.
          </p>
          <label className="mt-4 grid gap-1 text-sm">
            <span className="text-muted-foreground">Reason (optional)</span>
            <input
              className={inputClass}
              value={withdrawNote}
              onChange={(event) => setWithdrawNote(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={`mt-4 ${dangerButton}`}
            onClick={handleWithdraw}
            disabled={busy}
          >
            Withdraw application
          </button>
        </section>
      ) : null}

      {notice ? (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/account" className={primaryButton}>
          Back to your account
        </Link>
        <Link
          href={`/opportunities/${application.opportunity_id}`}
          className={secondaryButton}
        >
          View listing
        </Link>
      </div>
    </div>
  );
}
