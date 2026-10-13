"use client";

import { useState } from "react";

import {
  adminPing,
  devLogin,
  fetchCurrentUser,
  logout,
  type UserPublic,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type StatusKind = "idle" | "busy" | "ok" | "error";

interface Status {
  kind: StatusKind;
  message: string;
}

const IDLE: Status = { kind: "idle", message: "" };

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.code} (${error.status}): ${error.message}`;
  }
  return "Unexpected error.";
}

export function AdminCheck() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ping, setPing] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(IDLE);

  async function signIn() {
    setStatus({ kind: "busy", message: "Signing in as the demo admin…" });
    try {
      await devLogin("admin@awgu.local");
      const current = await fetchCurrentUser();
      setUser(current);
      setStatus({ kind: "ok", message: "Signed in. Session cookie is set." });
    } catch (error) {
      setUser(null);
      setStatus({ kind: "error", message: describe(error) });
    }
  }

  async function callAdminPing() {
    setStatus({ kind: "busy", message: "Calling the admin-only endpoint…" });
    try {
      const result = await adminPing();
      setPing(JSON.stringify(result, null, 2));
      setStatus({ kind: "ok", message: "Admin endpoint responded." });
    } catch (error) {
      setPing(null);
      setStatus({ kind: "error", message: describe(error) });
    }
  }

  async function signOut() {
    setStatus({ kind: "busy", message: "Signing out…" });
    try {
      await logout();
      setUser(null);
      setPing(null);
      setStatus({ kind: "ok", message: "Signed out." });
    } catch (error) {
      setStatus({ kind: "error", message: describe(error) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={signIn}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in as demo admin
        </button>
        <button
          type="button"
          onClick={callAdminPing}
          disabled={!user}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Call admin-only endpoint
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={!user}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign out
        </button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {status.message}
      </p>

      {user ? (
        <dl className="grid gap-1 rounded-lg border border-border bg-surface p-4 text-sm">
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

      {ping ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface-muted p-4 text-xs">
          {ping}
        </pre>
      ) : null}
    </div>
  );
}
