import type { Metadata } from "next";

import { AccountWorkspace } from "@/features/account/account-workspace";

export const metadata: Metadata = {
  title: "My account — Awgu StepForward",
  description:
    "Sign in to save opportunities, manage your private applicant profile, and track your applications.",
};

export default function AccountPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">My account</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Sign in to save opportunities, keep a private profile, and apply to
        opportunities in one place.
      </p>
      <div className="mt-8">
        <AccountWorkspace />
      </div>
    </section>
  );
}
