"use client";

import { useMutation } from "@tanstack/react-query";

import { InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSignOut, useSignedIn } from "@/features/account/queries";
import { adminPing, devLogin } from "@/lib/api/auth";

export function AdminCheck() {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const signedIn = useSignedIn();
  const signOut = useSignOut();

  const signIn = useMutation({
    mutationFn: () => devLogin("admin@awgu.local"),
    onSuccess: (result) => signedIn(result.user),
  });
  const ping = useMutation({ mutationFn: adminPing });

  const status = signIn.isPending
    ? "Signing in as the demo admin…"
    : ping.isPending
      ? "Calling the admin-only endpoint…"
      : ping.isSuccess
        ? "Admin endpoint responded."
        : user
          ? "Signed in. Session cookie is set."
          : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => signIn.mutate()} disabled={signIn.isPending}>
          Sign in as demo admin
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => ping.mutate()}
          disabled={!user || ping.isPending}
        >
          Call admin-only endpoint
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            ping.reset();
            signOut.mutate();
          }}
          disabled={!user}
        >
          Sign out
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {status}
      </p>
      <InlineError error={signIn.error ?? ping.error} />

      {user ? (
        <dl className="grid gap-1 rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Signed in as</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Roles</dt>
            <dd className="font-medium">{user.roles.join(", ") || "none"}</dd>
          </div>
        </dl>
      ) : null}

      {ping.data ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs">
          {JSON.stringify(ping.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
