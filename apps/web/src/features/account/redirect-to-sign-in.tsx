"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SectionSkeleton } from "@/components/shared/query-states";
import { signInHref } from "@/lib/sign-in";

import { justSignedOut } from "./queries";

/** For pages that need an account: send visitors to sign in, then back here. */
export function RedirectToSignIn({ next }: { next: string }) {
  const router = useRouter();
  useEffect(() => {
    // After "Sign out" we're already on our way to the home page.
    if (justSignedOut()) return;
    router.replace(signInHref(next));
  }, [router, next]);
  return <SectionSkeleton label="Taking you to sign in…" />;
}
