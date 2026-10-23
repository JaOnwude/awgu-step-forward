"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  devLogin,
  fetchAuthConfig,
  passwordSignIn,
  passwordSignUp,
  requestOtp,
  verifyOtp,
  type OtpChannel,
  type UserPublic,
} from "@/lib/api/auth";

import { queryKeys } from "@/lib/query/keys";

import { useSignedIn } from "./queries";

// Seeded by backend/app/scripts (synthetic data). Shown only in demo mode
// (the API runs with DEV_AUTH_ENABLED=true).
const DEMO_ACCOUNTS = [
  { role: "Applicant", email: "applicant@awgu.local" },
  { role: "Provider", email: "provider@awgu.local" },
  { role: "Staff", email: "admin@awgu.local" },
];

const PASSWORD_MIN_LENGTH = 8;

type Method = "code" | "password";

export function SignInCard({
  onSignedIn,
}: {
  /** Optional extra step after sign-in; the session cache is always updated. */
  onSignedIn?: (user: UserPublic) => void;
}) {
  const signedIn = useSignedIn();
  const config = useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: fetchAuthConfig,
    staleTime: Infinity,
  }).data;
  const demo = config?.demo_mode ?? false;
  // Codes that can't reach anyone (no email provider, not demo mode): open
  // on the password tab instead.
  const codesWork = !config || config.email_codes_delivered || demo;
  const [chosen, setChosen] = useState<Method | null>(null);
  const method: Method = chosen ?? (codesWork ? "code" : "password");

  const finish = (user: UserPublic) => {
    signedIn(user);
    onSignedIn?.(user);
  };

  const dev = useMutation({
    mutationFn: (email: string) => devLogin(email),
    onSuccess: (result) => finish(result.user),
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Sign in or create an account</h2>
        <CardDescription>
          Choose how: a one-time code sent to your email, or a password. Either one
          opens the same account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs value={method} onValueChange={(value) => setChosen(value as Method)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">
              <Mail aria-hidden /> Email code
            </TabsTrigger>
            <TabsTrigger value="password">
              <KeyRound aria-hidden /> Password
            </TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="pt-2">
            <CodeForm
              phoneAvailable={config?.phone_sign_in ?? false}
              codesWork={codesWork}
              disabled={dev.isPending}
              onSignedIn={finish}
            />
          </TabsContent>
          <TabsContent value="password" className="pt-2">
            <PasswordForm disabled={dev.isPending} onSignedIn={finish} />
          </TabsContent>
        </Tabs>

        {demo ? (
          <>
            <Separator />
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">
                Demo mode — try a sample account with one tap:
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    onClick={() => dev.mutate(account.email)}
                    disabled={dev.isPending}
                    className="h-auto min-w-0 flex-col items-start gap-0 py-2.5 text-left"
                  >
                    <span>{account.role}</span>
                    <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                      {account.email}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            <InlineError error={dev.error} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CodeForm({
  phoneAvailable,
  codesWork,
  disabled,
  onSignedIn,
}: {
  phoneAvailable: boolean;
  codesWork: boolean;
  disabled: boolean;
  onSignedIn: (user: UserPublic) => void;
}) {
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");

  const request = useMutation({
    mutationFn: () => requestOtp(channel, destination.trim()),
  });
  const verify = useMutation({
    mutationFn: () => verifyOtp(channel, destination.trim(), code.trim()),
    onSuccess: (result) => onSignedIn(result.user),
  });

  const sent = request.isSuccess;
  const busy = disabled || request.isPending || verify.isPending;

  function resetCode() {
    request.reset();
    verify.reset();
    setCode("");
  }

  return (
    <div className="grid gap-4">
      {!codesWork ? (
        <p className="rounded-lg border border-dashed bg-muted px-3 py-2 text-sm text-muted-foreground">
          Email codes aren&rsquo;t switched on here yet. Use the Password tab for now.
        </p>
      ) : null}
      {!sent ? (
        <form
          className={
            phoneAvailable
              ? "grid gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
              : "grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          }
          onSubmit={(event) => {
            event.preventDefault();
            request.mutate();
          }}
        >
          {/* Phone needs a funded SMS sender; until then it's demo-only. */}
          {phoneAvailable ? (
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
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="signin-destination">
              {channel === "email" ? "Email address" : "Phone number"}
            </Label>
            <Input
              id="signin-destination"
              type={channel === "email" ? "email" : "tel"}
              value={destination}
              autoComplete={channel === "email" ? "email" : "tel"}
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

      {request.data && !request.data.dev_code ? (
        <p role="status" className="text-sm text-muted-foreground">
          We emailed a code to{" "}
          <span className="font-medium text-foreground">{request.data.destination}</span>.
          It expires in 10 minutes. Not there after a minute? Check your spam folder.
        </p>
      ) : null}
      {request.data?.dev_code ? (
        <p
          role="status"
          className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          Demo mode — no message was sent. Your code is{" "}
          <span className="font-medium text-foreground">{request.data.dev_code}</span>.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        New here? Verifying a code creates your account. No password to remember.
      </p>

      <InlineError error={verify.error ?? request.error} />
    </div>
  );
}

function PasswordForm({
  disabled,
  onSignedIn,
}: {
  disabled: boolean;
  onSignedIn: (user: UserPublic) => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const creating = mode === "sign-up";

  const submit = useMutation({
    mutationFn: () =>
      creating
        ? passwordSignUp(email.trim(), password)
        : passwordSignIn(email.trim(), password),
    onSuccess: (result) => onSignedIn(result.user),
  });

  const tooShort = creating && password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const busy = disabled || submit.isPending;

  function switchMode() {
    setMode(creating ? "sign-in" : "sign-up");
    submit.reset();
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="password-email">Email address</Label>
        <Input
          id="password-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password-value">{creating ? "Choose a password" : "Password"}</Label>
        <div className="relative">
          <Input
            id="password-value"
            type={visible ? "text" : "password"}
            value={password}
            autoComplete={creating ? "new-password" : "current-password"}
            aria-describedby={creating ? "password-hint" : undefined}
            aria-invalid={tooShort || undefined}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          </button>
        </div>
        {creating ? (
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN_LENGTH} characters. A short sentence is easy to remember
            and hard to guess.
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={
          busy ||
          email.trim().length === 0 ||
          password.length === 0 ||
          (creating && password.length < PASSWORD_MIN_LENGTH)
        }
      >
        {creating ? "Create account" : "Sign in"}
      </Button>

      <InlineError error={submit.error} />

      <div className="grid gap-1 text-center text-sm text-muted-foreground">
        <p>
          {creating ? "Already have an account?" : "New to StepForward?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {creating ? "Sign in" : "Create an account"}
          </button>
        </p>
        {!creating ? (
          <p className="text-xs">
            Forgot it? Sign in with an email code, then set a new password on your
            account page.
          </p>
        ) : null}
      </div>
    </form>
  );
}
