"use client";

import { useState } from "react";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
} from "@/components/shared/query-states";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  SESSION_DELIVERY_MODES,
  type ManagedSession,
  sessionDeliveryLabel,
} from "@/lib/api/sessions";
import { formatWatDateTime } from "@/lib/format";

import {
  useManagedSessions,
  useProposeSession,
  useRecordAttendance,
  useRoster,
} from "./queries";

type Attendance = "unknown" | "attended" | "absent";

function Roster({ session }: { session: ManagedSession }) {
  const roster = useRoster(session.id);
  const mark = useRecordAttendance(session.id);

  if (roster.isPending) return <ListSkeleton rows={2} label="Loading roster…" />;
  if (roster.isError) {
    return <ErrorState error={roster.error} onRetry={() => roster.refetch()} />;
  }

  const active = roster.data.entries.filter((e) => e.status === "registered");
  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">No one has registered yet.</p>;
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        Only preferred names are shown. Contact details stay private.
      </p>
      <ul className="grid gap-2">
        {active.map((entry) => (
          <li
            key={entry.registration_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <span className="text-sm font-medium">{entry.preferred_name}</span>
            <div
              role="group"
              aria-label={`Attendance for ${entry.preferred_name}`}
              className="flex gap-2"
            >
              {(["attended", "absent"] as Attendance[]).map((state) => (
                <Button
                  key={state}
                  type="button"
                  size="xs"
                  variant={entry.attendance === state ? "default" : "outline"}
                  aria-pressed={entry.attendance === state}
                  disabled={mark.isPending}
                  onClick={() =>
                    mark.mutate({
                      registrationId: entry.registration_id,
                      attendance: entry.attendance === state ? "unknown" : state,
                    })
                  }
                >
                  {state === "attended" ? "Attended" : "Absent"}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <InlineError error={mark.error} />
    </div>
  );
}

function toIso(local: string): string {
  // <input type="datetime-local"> has no zone; the browser's zone (WAT for
  // Nigerian users) is applied here and the API stores UTC.
  return new Date(local).toISOString();
}

export function OrganizerPanel({
  organizationId,
  canPropose,
}: {
  organizationId: string | null;
  canPropose: boolean;
}) {
  const sessions = useManagedSessions();
  const propose = useProposeSession();
  const [openRoster, setOpenRoster] = useState<string | null>(null);

  const [topic, setTopic] = useState("CV and application help desk");
  const [description, setDescription] = useState(
    "Bring your CV or application form and get one-to-one help from a volunteer.",
  );
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [mode, setMode] = useState<string>("onsite");
  const [location, setLocation] = useState("Awgu Town Hall");
  const [capacity, setCapacity] = useState("20");
  const [accessibility, setAccessibility] = useState("");
  const [contact, setContact] = useState("");

  const ownSessions = (sessions.data ?? []).filter(
    (s) => !organizationId || s.organization_id === organizationId,
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Application support sessions</h2>
        <CardDescription>
          Propose a free workshop or help desk. Our team reviews each session before
          it is listed publicly.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {canPropose && organizationId ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!startsAt || !endsAt) return;
              propose.mutate({
                organization_id: organizationId,
                topic: topic.trim(),
                description: description.trim(),
                starts_at: toIso(startsAt),
                ends_at: toIso(endsAt),
                delivery_mode: mode,
                location: location.trim(),
                capacity: Number.parseInt(capacity, 10) || 0,
                accessibility_notes: accessibility.trim() || null,
                organizer_contact: contact.trim(),
              });
            }}
          >
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="session-topic">Topic</Label>
              <Input
                id="session-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="session-description">What will happen</Label>
              <Textarea
                id="session-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-starts">Starts (WAT)</Label>
              <Input
                id="session-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-ends">Ends (WAT)</Label>
              <Input
                id="session-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-mode">Format</Label>
              <NativeSelect
                id="session-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {SESSION_DELIVERY_MODES.map((value) => (
                  <option key={value} value={value}>
                    {sessionDeliveryLabel(value)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-location">Venue area or online method</Label>
              <Input
                id="session-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-capacity">Places</Label>
              <Input
                id="session-capacity"
                type="number"
                min={1}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="session-contact">Organiser contact</Label>
              <Input
                id="session-contact"
                value={contact}
                placeholder="Public email or phone for questions"
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="session-accessibility">Accessibility notes</Label>
              <Input
                id="session-accessibility"
                value={accessibility}
                placeholder="e.g. step-free entrance, captions, interpreter on request"
                onChange={(e) => setAccessibility(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={propose.isPending}>
                Submit session for review
              </Button>
              {propose.isSuccess ? (
                <span role="status" className="text-sm text-muted-foreground">
                  Submitted. A staff member will review it.
                </span>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <InlineError error={propose.error} />
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a verified provider above to propose a session.
          </p>
        )}

        <div className="grid gap-3">
          <h3 className="text-base font-bold">Your sessions</h3>
          {sessions.isPending ? (
            <ListSkeleton rows={1} label="Loading your sessions…" />
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          ) : ownSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <ul className="grid gap-3">
              {ownSessions.map((session) => (
                <li
                  key={session.id}
                  className="grid gap-3 rounded-xl border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{session.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatWatDateTime(session.starts_at)} WAT ·{" "}
                        {session.registered_count}/{session.capacity} registered
                      </p>
                    </div>
                    <ListingStatusBadge status={session.status} />
                  </div>
                  {session.decision_reason ? (
                    <p className="text-sm text-muted-foreground">
                      Reviewer note: {session.decision_reason}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    aria-expanded={openRoster === session.id}
                    onClick={() =>
                      setOpenRoster((current) =>
                        current === session.id ? null : session.id,
                      )
                    }
                  >
                    {openRoster === session.id ? "Hide roster" : "Show roster"}
                  </Button>
                  {openRoster === session.id ? <Roster session={session} /> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
