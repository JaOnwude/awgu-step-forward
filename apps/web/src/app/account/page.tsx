import type { Metadata } from "next";

import { AccountWorkspace } from "@/features/account/account-workspace";

export const metadata: Metadata = {
  title: "My account — Awgu StepForward",
  description:
    "Sign in to save opportunities, manage your private applicant profile, and track your applications.",
};

export default function AccountPage() {
  // The workspace renders its own heading: a sign-in title or a greeting.
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <AccountWorkspace />
    </section>
  );
}
