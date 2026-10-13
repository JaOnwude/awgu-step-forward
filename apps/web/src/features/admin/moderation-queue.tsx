"use client";

import { useState } from "react";

import { describeApiError } from "@/lib/api/errors";
import { devLogin, logout, type UserPublic } from "@/lib/api/auth";
import {
  decideListing,
  decideProvider,
  fetchModerationQueue,
  type ModerationQueue,
} from "@/lib/api/moderation";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import {
  dangerButton,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "@/lib/ui";

interface Status {
  kind: "idle" | "busy" | "ok" | "error";
  message: string;
}

const IDLE: Status = { kind: "idle", message: "" };

export function ModerationQueue() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [email, setEmail] = useState("admin@awgu.local");
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rationale, setRationale] = useState(
    "Registration and public contact confirmed.",
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(IDLE);

  function setReason(id: string, value: string) {
    setReasons((current) => ({ ...current, [id]: value }));
  }

  async function loadQueue() {
    const data = await fetchModerationQueue();
    setQueue(data);
    return data;
  }

  async function handleSignIn() {
    setStatus({ kind: "busy", message: "Signing in…" });
    try {
      const current = await devLogin(email.trim().toLowerCase());
      setUser(current.user);
      await loadQueue();
      setStatus({ kind: "ok", message: "Signed in." });
    } catch (error) {
      setUser(null);
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleSignOut() {
    setStatus({ kind: "busy", message: "Signing out…" });
    try {
      await logout();
      setUser(null);
      setQueue(null);
      setStatus({ kind: "ok", message: "Signed out." });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleQueueRefresh() {
    setStatus({ kind: "busy", message: "Refreshing queue…" });
    try {
      await loadQueue();
      setStatus({ kind: "ok", message: "Queue refreshed." });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleProvider(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setStatus({ kind: "busy", message: `Recording provider ${decision}…` });
    try {
      await decideProvider(id, decision, rationale);
      await loadQueue();
      setStatus({ kind: "ok", message: `Provider ${decision}d.` });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleListing(
    id: string,
    decision: "approve" | "reject" | "request_changes" | "suspend",
  ) {
    setBusyId(id);
    setStatus({ kind: "busy", message: `Recording listing ${decision}…` });
    try {
      await decideListing(id, decision, reasons[id] ?? null);
      await loadQueue();
      setStatus({ kind: "ok", message: `Listing ${decision}.` });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-medium">Session</h2>
        {user ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>
              {user.roles.length ? ` · ${user.roles.join(", ")}` : ""}
            </p>
            <button type="button" className={secondaryButton} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className={labelClass}>
              <span className="text-muted-foreground">Development email</span>
              <input
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="off"
              />
            </label>
            <button type="button" className={primaryButton} onClick={handleSignIn}>
              Sign in
            </button>
          </div>
        )}
      </section>

      {user ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Provider verification queue</h2>
              <button
                type="button"
                className={secondaryButton}
                onClick={handleQueueRefresh}
              >
                Refresh
              </button>
            </div>
            <label className={`mt-4 ${labelClass}`}>
              <span className="text-muted-foreground">Verification rationale</span>
              <input
                className={inputClass}
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
              />
            </label>
            {!queue || queue.providers.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No providers awaiting verification.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {queue.providers.map((provider) => (
                  <li
                    key={provider.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider.provider_type} · {provider.operating_area}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <VerificationBadge status={provider.verification_status} />
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={busyId === provider.id}
                        onClick={() => handleProvider(provider.id, "approve")}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className={dangerButton}
                        disabled={busyId === provider.id}
                        onClick={() => handleProvider(provider.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-medium">Listing review queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Approve, request changes, reject, or suspend each submitted listing.
            </p>
            {!queue || queue.listings.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No listings awaiting review.
              </p>
            ) : (
              <ul className="mt-4 grid gap-4">
                {queue.listings.map((listing) => (
                  <li
                    key={listing.id}
                    className="grid gap-3 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {listing.opportunity_type} · {listing.location}
                        </p>
                      </div>
                      <ListingStatusBadge status={listing.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {listing.description}
                    </p>
                    <label className={labelClass}>
                      <span className="text-muted-foreground">
                        Reason (required for changes, reject, suspend)
                      </span>
                      <input
                        className={inputClass}
                        value={reasons[listing.id] ?? ""}
                        onChange={(event) => setReason(listing.id, event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={busyId === listing.id}
                        onClick={() => handleListing(listing.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={busyId === listing.id}
                        onClick={() => handleListing(listing.id, "request_changes")}
                      >
                        Request changes
                      </button>
                      <button
                        type="button"
                        className={dangerButton}
                        disabled={busyId === listing.id}
                        onClick={() => handleListing(listing.id, "reject")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className={dangerButton}
                        disabled={busyId === listing.id}
                        onClick={() => handleListing(listing.id, "suspend")}
                      >
                        Suspend
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${
          status.kind === "error" ? "text-danger" : "text-muted-foreground"
        }`}
      >
        {status.message}
      </p>
    </div>
  );
}
