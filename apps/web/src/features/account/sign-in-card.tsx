"use client";

import { useState } from "react";

import {
  devLogin,
  requestOtp,
  verifyOtp,
  type OtpChannel,
  type UserPublic,
} from "@/lib/api/auth";
import { describeApiError } from "@/lib/api/errors";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/lib/ui";

export function SignInCard({
  onSignedIn,
}: {
  onSignedIn: (user: UserPublic) => void;
}) {
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleRequest() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestOtp(channel, destination.trim());
      setSent(true);
      setDevCode(result.dev_code);
      setNotice(`We sent a code to ${result.destination}.`);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError("");
    try {
      const result = await verifyOtp(channel, destination.trim(), code.trim());
      onSignedIn(result.user);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleDevSignIn() {
    setBusy(true);
    setError("");
    try {
      const result = await devLogin(destination.trim().toLowerCase());
      onSignedIn(result.user);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-medium">Sign in or create an account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use your email or phone number. We send a one-time code — no password to
        remember.
      </p>

      {!sent ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <label className={labelClass}>
            <span className="text-muted-foreground">Sign in with</span>
            <select
              className={inputClass}
              value={channel}
              onChange={(event) => setChannel(event.target.value as OtpChannel)}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">
              {channel === "email" ? "Email address" : "Phone number"}
            </span>
            <input
              className={inputClass}
              type={channel === "email" ? "email" : "tel"}
              value={destination}
              autoComplete="off"
              onChange={(event) => setDestination(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={primaryButton}
            onClick={handleRequest}
            disabled={busy || destination.trim().length === 0}
          >
            Send code
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className={labelClass}>
            <span className="text-muted-foreground">One-time code</span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={code}
              autoComplete="one-time-code"
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={primaryButton}
            onClick={handleVerify}
            disabled={busy || code.trim().length === 0}
          >
            Verify
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setSent(false);
              setCode("");
              setDevCode(null);
            }}
            disabled={busy}
          >
            Change
          </button>
        </div>
      )}

      {devCode ? (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          Development mode: your code is <span className="font-medium text-foreground">{devCode}</span>.
        </p>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Demo shortcut (development only)
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setChannel("email");
              setDestination("applicant@awgu.local");
            }}
            disabled={busy}
          >
            Use applicant@awgu.local
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={handleDevSignIn}
            disabled={busy || destination.trim().length === 0}
          >
            Dev sign in
          </button>
        </div>
      </div>

      {notice ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
