"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { applicationStatusLabel } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  TRACKING_STATUSES,
  type ApplicationDetail,
  type TrackingStatus,
} from "@/lib/api/applications";

import { useUpdateTracking } from "./queries";

/** Record progress on an application made on a provider's site or in person. */
export function TrackingCard({ application }: { application: ApplicationDetail }) {
  const [status, setStatus] = useState<TrackingStatus>(
    (TRACKING_STATUSES as readonly string[]).includes(application.status)
      ? (application.status as TrackingStatus)
      : "started",
  );
  const [note, setNote] = useState(application.private_note ?? "");
  const update = useUpdateTracking(application.id);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Update your progress</h2>
        <CardDescription>
          You applied {application.route === "in_person" ? "in person" : "on the provider’s site"},
          so StepForward can’t see what happens next. Record each step here to keep track.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate({ status, note: note.trim() || null });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="tracking-status">Where things stand</Label>
            <NativeSelect
              id="tracking-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TrackingStatus)}
            >
              {TRACKING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {applicationStatusLabel(value)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tracking-note">Private note (only you see this)</Label>
            <Textarea
              id="tracking-note"
              rows={3}
              maxLength={2000}
              value={note}
              placeholder="e.g. Sent my CV by email on Monday. Interview on the 3rd."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={update.isPending}>
              Save update
            </Button>
            {update.isSuccess ? (
              <span role="status" className="text-sm text-success">
                Saved.
              </span>
            ) : null}
          </div>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            These statuses are reported by you and are never shown as confirmed by the
            provider.
          </p>
          <InlineError error={update.error} />
        </form>
      </CardContent>
    </Card>
  );
}
