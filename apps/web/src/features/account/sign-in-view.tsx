"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

import { SectionSkeleton } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UserPublic } from "@/lib/api/auth";
import { accountLabel, homeFor, safeNext } from "@/lib/sign-in";

import { useCurrentUser, useSignOut } from "./queries";
import { SignInCard } from "./sign-in-card";

/**
 * The one sign-in page for applicants, providers and staff. After signing in
 * we confirm it with a message and take the person back where they came from
 * (`?next=`), or to the home of their account type.
 */
export function SignInView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const userQuery = useCurrentUser();
  // Stay on this page after "Use another account".
  const signOut = useSignOut({ redirectTo: null });
  // Set once we've signed someone in here, so the "already signed in" panel
  // doesn't flash while we navigate away.
  const [leaving, setLeaving] = useState(false);

  function onSignedIn(user: UserPublic) {
    setLeaving(true);
    toast.success("You're signed in", {
      description: `Welcome to StepForward, ${accountLabel(user)}.`,
    });
    router.replace(next ?? homeFor(user));
  }

  if (userQuery.isPending || leaving) {
    return <SectionSkeleton label="Checking your session…" />;
  }

  const user = userQuery.data;
  if (user) {
    const destination = next ?? homeFor(user);
    return (
      <Card>
        <CardContent className="grid justify-items-center gap-4 py-4 text-center">
          <CheckCircle2 aria-hidden className="size-10 text-success" />
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">You&rsquo;re already signed in</h2>
            <p className="text-sm text-muted-foreground">as {accountLabel(user)}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={destination} className={buttonVariants()}>
              Continue
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
            >
              Use another account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <SignInCard onSignedIn={onSignedIn} />
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock aria-hidden className="size-3.5" /> Your profile is never public.{" "}
        <Link href="/privacy" className="font-semibold text-primary hover:underline">
          Privacy notice
        </Link>
      </p>
    </div>
  );
}
