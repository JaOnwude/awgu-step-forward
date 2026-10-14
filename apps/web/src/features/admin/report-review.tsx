"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, Clock } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runReminderJob } from "@/lib/api/notifications";
import {
  decideReport,
  reportCategoryLabel,
  type ReportAction,
  type StaffReport,
} from "@/lib/api/reports";
import { queryKeys } from "@/lib/query/keys";

function targetHref(report: StaffReport): string {
  return report.target_type === "opportunity"
    ? `/opportunities/${report.target_id}`
    : `/sessions/${report.target_id}`;
}

/** Report queue (spec R21/R45): urgent first, with age and overdue state. */
export function ReportReview({ reports }: { reports: StaffReport[] }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ReportAction }) =>
      decideReport(id, action, (notes[id] ?? "").trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.moderationQueue }),
  });
  const busyId = decide.isPending ? decide.variables?.id : undefined;
  const urgentCount = reports.filter((r) => r.urgent).length;

  return (
    <Card className={urgentCount ? "border-danger/40" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Reports</h2>
          {urgentCount ? (
            <StatusBadge tone="danger" icon={AlertTriangle}>
              {urgentCount} urgent · same day
            </StatusBadge>
          ) : null}
        </div>
        <CardDescription>
          Urgent safety and money reports are due the same day; others within 48 hours.
          Reporters are never shown to providers.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <ul className="grid gap-4">
            {reports.map((report) => {
              const noteId = `report-note-${report.id}`;
              const note = (notes[report.id] ?? "").trim();
              const act = (action: ReportAction) => decide.mutate({ id: report.id, action });
              return (
                <li
                  key={report.id}
                  className={`grid gap-3 rounded-xl border p-4 ${
                    report.urgent ? "border-danger/40 bg-danger-muted/40" : "bg-background"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={report.urgent ? "danger" : "neutral"} icon={report.urgent ? AlertTriangle : undefined}>
                      {reportCategoryLabel(report.category)}
                    </StatusBadge>
                    <StatusBadge tone={report.overdue ? "danger" : "warning"} icon={Clock}>
                      {report.age_hours} h{report.overdue ? " · overdue" : ""}
                    </StatusBadge>
                    <StatusBadge tone="outline">
                      {report.signed_in_reporter ? "Signed-in reporter" : "Anonymous"}
                    </StatusBadge>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      {report.target_type === "opportunity" ? "Listing" : "Session"}:{" "}
                    </span>
                    <Link href={targetHref(report)} className="font-semibold hover:underline">
                      {report.target_title}
                    </Link>
                  </p>
                  {report.details ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm">“{report.details}”</p>
                  ) : null}
                  <div className="grid gap-1.5">
                    <Label htmlFor={noteId}>Decision note (required, kept in the audit log)</Label>
                    <Input
                      id={noteId}
                      value={notes[report.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [report.id]: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busyId === report.id || note.length < 3}
                      onClick={() => act("suspend_target")}
                    >
                      Suspend {report.target_type === "opportunity" ? "listing" : "session"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === report.id || note.length < 3}
                      onClick={() => act("resolve")}
                    >
                      Resolve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId === report.id || note.length < 3}
                      onClick={() => act("dismiss")}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <InlineError error={decide.error} />
      </CardContent>
    </Card>
  );
}

/** Week-1 stand-in for a scheduler: run the reminder job on demand. */
export function ReminderJobCard() {
  const run = useMutation({ mutationFn: runReminderJob });
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Reminders</h2>
        <CardDescription>
          Sends due deadline and session reminders now. In this demo, email and SMS are
          written to the server log only — nobody receives a real message.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => run.mutate()}
          disabled={run.isPending}
        >
          <BellRing aria-hidden /> Run reminder job
        </Button>
        {run.data ? (
          <p role="status" className="text-sm text-muted-foreground">
            Sent {run.data.deadline_reminders} deadline and {run.data.session_reminders}{" "}
            session reminder(s). Already-sent reminders are skipped.
          </p>
        ) : null}
        <InlineError error={run.error} />
      </CardContent>
    </Card>
  );
}
