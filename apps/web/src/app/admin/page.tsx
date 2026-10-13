import type { Metadata } from "next";

import { ModerationQueue } from "@/features/admin/moderation-queue";

export const metadata: Metadata = {
  title: "Staff moderation workspace — Awgu StepForward",
  description:
    "Verify providers and review submitted listings before they become public.",
};

export default function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Staff moderation workspace
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Verify providers and review submitted listings. Every decision is
        recorded in the audit trail. This workspace is restricted to
        administrators on the server.
      </p>
      <div className="mt-8">
        <ModerationQueue />
      </div>
    </section>
  );
}
