import type { Metadata } from "next";
import { Suspense } from "react";

import { SectionSkeleton } from "@/components/shared/query-states";
import { SignInView } from "@/features/account/sign-in-view";

export const metadata: Metadata = {
  title: "Sign in — Awgu StepForward",
  description:
    "Sign in or create an account with a one-time code. Applicants, providers and staff all sign in here.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <section className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12 sm:px-6">
      <header className="grid gap-2 text-center">
        <p className="eyebrow text-highlight">Welcome</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">
          Sign in to StepForward
        </h1>
        <p className="text-muted-foreground">
          One place for everyone: applicants, providers and staff. New here? Signing in
          with a code creates your account.
        </p>
      </header>
      {/* The ?next= return address is read inside Suspense (Cache Components). */}
      <Suspense fallback={<SectionSkeleton label="Loading sign-in…" />}>
        <SignInView />
      </Suspense>
    </section>
  );
}
