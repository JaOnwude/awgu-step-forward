"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword, type UserPublic } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query/keys";

const PASSWORD_MIN_LENGTH = 8;

/** Add a password to a code-only account, or change it. */
export function PasswordCard({ user }: { user: UserPublic }) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const save = useMutation({
    mutationFn: () => setPassword(next, current),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      toast.success(user.has_password ? "Password changed" : "Password added", {
        description: "You can now sign in with your email code or your password.",
      });
      setCurrent("");
      setNext("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <KeyRound aria-hidden className="size-5 text-primary" /> Password
        </h2>
        <CardDescription>
          {user.has_password
            ? "You can sign in with a password or an email code. Changing it signs you out on other devices."
            : "Add a password to sign in without waiting for an email code. Codes keep working too."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          {/* Lets password managers file the new password under this account. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={user.email ?? ""}
            readOnly
            hidden
          />
          {user.has_password ? (
            <div className="grid gap-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                aria-describedby="current-password-hint"
                onChange={(event) => setCurrent(event.target.value)}
              />
              <p id="current-password-hint" className="text-xs text-muted-foreground">
                Forgot it? If you signed in with an email code, leave this empty.
              </p>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">
              {user.has_password ? "New password" : "Choose a password"}
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              aria-describedby="new-password-hint"
              onChange={(event) => setNext(event.target.value)}
            />
            <p id="new-password-hint" className="text-xs text-muted-foreground">
              At least {PASSWORD_MIN_LENGTH} characters.
            </p>
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={save.isPending || next.length < PASSWORD_MIN_LENGTH}
          >
            {save.isPending ? "Saving…" : user.has_password ? "Change password" : "Add password"}
          </Button>
          <InlineError error={save.error} />
        </form>
      </CardContent>
    </Card>
  );
}
