import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { SectionSkeleton } from "@/components/shared/query-states";
import { SignInView } from "@/features/account/sign-in-view";
import { SIGN_IN_IMAGE } from "@/lib/images";

export const metadata: Metadata = {
  title: "Sign in — Awgu StepForward",
  description:
    "Sign in or create an account with a one-time email code or a password. Applicants, providers and staff all sign in here.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    // Side by side only on wide screens: with the sidebar open, narrower
    // screens leave too little room for the form beside the photo.
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] xl:items-center xl:gap-12 xl:py-12">
      {/* Decorative: models from Pexels, not StepForward users. Until then a
          short banner, so the form stays near the top of the screen. */}
      <figure className="relative h-44 overflow-hidden rounded-3xl bg-[#0b2a20] sm:h-60 xl:h-[min(42rem,calc(100dvh-9rem))]">
        <Image
          src={SIGN_IN_IMAGE.src}
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 40vw, 100vw"
          className="object-cover object-[center_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#08201a]/85 via-[#08201a]/25 to-transparent"
        />
        <figcaption className="absolute inset-x-0 bottom-0 grid gap-1 p-5 text-white sm:p-7">
          <p className="font-display text-2xl font-semibold sm:text-3xl">
            Your next step starts here.
          </p>
          <p className="max-w-sm text-sm text-white/85">
            Scholarships, training and work across Enugu State, with Awgu first.
          </p>
        </figcaption>
      </figure>

      <div className="grid min-w-0 gap-6">
        <header className="grid gap-2">
          <p className="eyebrow text-highlight">Welcome</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Sign in to StepForward
          </h1>
          <p className="text-muted-foreground">
            One place for everyone: applicants, providers and staff. New here? Create
            your account with an email code or a password.
          </p>
        </header>
        {/* The ?next= return address is read inside Suspense (Cache Components). */}
        <Suspense fallback={<SectionSkeleton label="Loading sign-in…" />}>
          <SignInView />
        </Suspense>
      </div>
    </section>
  );
}
