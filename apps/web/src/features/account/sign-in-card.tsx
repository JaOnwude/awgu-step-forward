"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
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
import { Separator } from "@/components/ui/separator";
import {
  devLogin,
  requestOtp,
  verifyOtp,
  type OtpChannel,
  type UserPublic,
} from "@/lib/api/auth";

import { useSignedIn } from "./queries";

export function SignInCard({
  onSignedIn,
}: {
  /** Optional extra step after sign-in; the session cache is always updated. */
  onSignedIn?: (user: UserPublic) => void;
}) {
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const signedIn = useSignedIn();

  const finish = (user: UserPublic) => {
    signedIn(user);
    onSignedIn?.(user);
  };

  const request = useMutation({
    mutationFn: () => requestOtp(channel, destination.trim()),
  });
  const verify = useMutation({
    mutationFn: () => verifyOtp(channel, destination.trim(), code.trim()),
    onSuccess: (result) => finish(result.user),
  });
  const dev = useMutation({
    mutationFn: () => devLogin(destination.trim().toLowerCase()),
    onSuccess: (result) => finish(result.user),
  });

  const sent = request.isSuccess;
  const busy = request.isPending || verify.isPending || dev.isPending;
  const error = verify.error ?? dev.error ?? request.error;

  function resetCode() {
    request.reset();
    verify.reset();
    setCode("");
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Sign in or create an account</h2>
        <CardDescription>
          Use your email or phone number. We send a one-time code — no password
          to remember. Lost access? Just request a new code.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!sent ? (
          <form
            className="grid gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              request.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="signin-channel">Sign in with</Label>
              <NativeSelect
                id="signin-channel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as OtpChannel)}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="signin-destination">
                {channel === "email" ? "Email address" : "Phone number"}
              </Label>
              <Input
                id="signin-destination"
                type={channel === "email" ? "email" : "tel"}
                value={destination}
                autoComplete="off"
                onChange={(event) => setDestination(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || destination.trim().length === 0}>
              Send code
            </Button>
          </form>
        ) : (
          <form
            className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              verify.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="signin-code">One-time code</Label>
              <Input
                id="signin-code"
                inputMode="numeric"
                value={code}
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || code.trim().length === 0}>
              Verify
            </Button>
            <Button type="button" variant="outline" onClick={resetCode} disabled={busy}>
              Change
            </Button>
          </form>
        )}

        {request.data ? (
          <p role="status" className="text-sm text-muted-foreground">
            We sent a code to {request.data.destination}.
          </p>
        ) : null}
        {request.data?.dev_code ? (
          <p className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Development mode: your code is{" "}
            <span className="font-medium text-foreground">{request.data.dev_code}</span>.
          </p>
        ) : null}

        <Separator />
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">
            Demo shortcut (development only)
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setChannel("email");
                setDestination("applicant@awgu.local");
              }}
              disabled={busy}
            >
              Use applicant@awgu.local
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => dev.mutate()}
              disabled={busy || destination.trim().length === 0}
            >
              Dev sign in
            </Button>
          </div>
        </div>

        <InlineError error={error} />
      </CardContent>
    </Card>
  );
}
