"use client";

import Link from "next/link";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/features/account/queries";
import type { SupportSession } from "@/lib/api/sessions";

import {
  useCancelSessionRegistration,
  useMySessionRegistrations,
  useRegisterForSession,
  useSession,
} from "./queries";

export function RegisterPanel({ initial }: { initial: SupportSession }) {
  const userQuery = useCurrentUser();
  const signedIn = Boolean(userQuery.data);
  const sessionQuery = useSession(initial.id);
  const session = sessionQuery.data ?? initial;
  const mine = useMySessionRegistrations(signedIn);
  const register = useRegisterForSession(initial.id);
  const cancel = useCancelSessionRegistration(initial.id);
  const [reminder, setReminder] = useState(true);

  const registration = mine.data?.find(
    (r) => r.session_id === initial.id && r.status === "registered",
  );
  const started = session.has_started;
  const seats = (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {session.seats_left} of {session.capacity} places left
    </p>
  );

  if (userQuery.isSuccess && !signedIn) {
    return (
      <div className="grid gap-2">
        <Link href="/account" className={buttonVariants({ className: "w-fit" })}>
          Sign in to register
        </Link>
        <p className="text-xs text-muted-foreground">
          Registering is free. You need an adult (18+) applicant profile.
        </p>
      </div>
    );
  }

  if (registration) {
    return (
      <div className="grid gap-3">
        {seats}
        <p role="status" className="text-sm font-medium text-verified">
          You’re registered for this session.
          {registration.reminder_opt_in ? " We’ll remind you before it starts." : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending || started}
        >
          Cancel my place
        </Button>
        <InlineError error={cancel.error} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {seats}
      <div className="flex items-center gap-2">
        <Checkbox
          id="session-reminder"
          checked={reminder}
          onCheckedChange={(state) => setReminder(state === true)}
        />
        <Label htmlFor="session-reminder" className="font-normal">
          Remind me before the session
        </Label>
      </div>
      <Button
        type="button"
        className="w-fit"
        onClick={() => register.mutate(reminder)}
        disabled={
          !signedIn || mine.isPending || register.isPending || session.is_full || started
        }
      >
        {started
          ? "Registration closed"
          : session.is_full
            ? "Session full"
            : "Register for free"}
      </Button>
      {cancel.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          Your place has been cancelled.
        </p>
      ) : null}
      <InlineError error={register.error} />
    </div>
  );
}
