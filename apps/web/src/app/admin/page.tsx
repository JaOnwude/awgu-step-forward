import type { Metadata } from "next";

import { ModerationQueue } from "@/features/admin/moderation-queue";

export const metadata: Metadata = {
  title: "Staff review queue — Awgu StepForward",
  description: "Verify providers and review listings and support sessions before they become public.",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="grid gap-2">
        <p className="eyebrow text-highlight">Staff workspace</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Review queue</h1>
        <p className="max-w-2xl text-muted-foreground">
          Routine target: first decision within 48 hours. Every decision is written to the
          audit log with your name and reason. Access is checked on the server.
        </p>
      </header>
      <div className="mt-8">
        <ModerationQueue />
      </div>
    </section>
  );
}
