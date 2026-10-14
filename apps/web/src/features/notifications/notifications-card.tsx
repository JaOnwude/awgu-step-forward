"use client";

import Link from "next/link";
import { BellOff } from "lucide-react";
import { useState } from "react";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
  SectionSkeleton,
} from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { NotificationPreferences, PreferencesInput } from "@/lib/api/notifications";
import { formatWatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useMarkRead, useNotifications, usePreferences, useSavePreferences } from "./queries";

export function NotificationsInbox() {
  const inbox = useNotifications();
  const markRead = useMarkRead();
  const items = inbox.data?.items ?? [];

  return (
    <Card id="notifications" className="scroll-mt-24">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            Notifications
            {inbox.data?.unread ? (
              <span className="ml-2 rounded-full bg-sun px-2 py-0.5 text-xs text-sun-foreground">
                {inbox.data.unread} new
              </span>
            ) : null}
          </h2>
          {inbox.data?.unread ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => markRead.mutate("all")}
              disabled={markRead.isPending}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {inbox.isPending ? (
          <ListSkeleton rows={2} label="Loading notifications…" />
        ) : inbox.isError ? (
          <ErrorState error={inbox.error} onRetry={() => inbox.refetch()} />
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellOff aria-hidden className="size-4" /> Nothing yet. Reminders about saved
            deadlines and booked sessions appear here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "grid gap-1 rounded-xl border px-4 py-3",
                  item.read_at ? "bg-background" : "border-primary/30 bg-primary-muted",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{item.subject}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatWatDateTime(item.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <div className="flex gap-3 text-sm">
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="font-semibold text-primary hover:underline"
                      onClick={() => !item.read_at && markRead.mutate(item.id)}
                    >
                      Open
                    </Link>
                  ) : null}
                  {!item.read_at ? (
                    <button
                      type="button"
                      className="font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const [draft, setDraft] = useState<PreferencesInput>({
    email_enabled: initial.email_enabled,
    sms_enabled: initial.sms_enabled,
    deadline_reminders: initial.deadline_reminders,
    session_reminders: initial.session_reminders,
    marketing_opt_in: initial.marketing_opt_in,
  });
  const save = useSavePreferences();

  const toggle = (key: keyof PreferencesInput, disabled = false, hint?: string) => (
    <div className="flex items-start gap-3">
      <Checkbox
        id={`pref-${key}`}
        checked={draft[key]}
        disabled={disabled}
        onCheckedChange={(state) => setDraft((d) => ({ ...d, [key]: state === true }))}
        className="mt-0.5"
      />
      <Label htmlFor={`pref-${key}`} className="grid gap-0.5 font-normal">
        <span className="font-semibold">{LABELS[key]}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </Label>
    </div>
  );

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(draft);
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="eyebrow mb-1 text-muted-foreground">Remind me about</legend>
        {toggle("deadline_reminders", false, "When a saved opportunity is about to close")}
        {toggle("session_reminders", false, "Before a support session you booked")}
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="eyebrow mb-1 text-muted-foreground">Also send them by</legend>
        <p className="text-xs text-muted-foreground">
          You always get them here in StepForward.
        </p>
        {toggle(
          "email_enabled",
          !initial.email_available,
          initial.email_available ? "To your verified email" : "Sign in with email first to use this",
        )}
        {toggle(
          "sms_enabled",
          !initial.sms_available,
          initial.sms_available ? "To your verified phone" : "Sign in with a phone number first to use this",
        )}
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="eyebrow mb-1 text-muted-foreground">Optional</legend>
        {toggle("marketing_opt_in", false, "Occasional news about new programmes. Off by default.")}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          Save preferences
        </Button>
        {save.isSuccess ? (
          <span role="status" className="text-sm text-success">
            Saved.
          </span>
        ) : null}
      </div>
      <InlineError error={save.error} />
    </form>
  );
}

const LABELS: Record<keyof PreferencesInput, string> = {
  deadline_reminders: "Closing deadlines",
  session_reminders: "Support sessions",
  email_enabled: "Email",
  sms_enabled: "SMS",
  marketing_opt_in: "News and updates",
};

export function NotificationPreferencesCard() {
  const prefs = usePreferences();
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Reminder settings</h2>
        <CardDescription>
          Messages use neutral wording, so they’re safe on a shared phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {prefs.isPending ? (
          <SectionSkeleton label="Loading reminder settings…" />
        ) : prefs.isError ? (
          <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />
        ) : (
          <PreferencesForm initial={prefs.data} />
        )}
      </CardContent>
    </Card>
  );
}
