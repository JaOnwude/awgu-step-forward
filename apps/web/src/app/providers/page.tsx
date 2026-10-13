import type { Metadata } from "next";

import { ProviderWorkspace } from "@/features/provider/provider-workspace";

export const metadata: Metadata = {
  title: "Provider workspace — Awgu StepForward",
  description:
    "Request provider access, track verification, and submit listing drafts for review.",
};

export default function ProvidersPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Provider workspace
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Request provider access, track your verification status, and submit
        listing drafts. A staff member reviews every listing before it becomes
        public.
      </p>
      <div className="mt-8">
        <ProviderWorkspace />
      </div>
    </section>
  );
}
