import type { Metadata } from "next";

import { ProviderWorkspace } from "@/features/provider/provider-workspace";

export const metadata: Metadata = {
  title: "Provider workspace — Awgu StepForward",
  description:
    "Request provider access, track verification, and submit listings and support sessions for review.",
};

export default function ProvidersPage() {
  return (
    <>
      <div className="border-b bg-muted">
        <div className="mx-auto grid w-full max-w-6xl items-end gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="grid gap-3">
            <p className="eyebrow text-highlight">For providers &amp; employers</p>
            <h1 className="font-display text-4xl leading-[1.08] font-semibold sm:text-5xl">
              Share opportunities, <em className="font-normal">safely.</em>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Request access, get verified, then submit scholarships, jobs, training or paid
            local work. Our team reviews every listing and session before it goes public.
          </p>
        </div>
      </div>
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <ProviderWorkspace />
      </section>
    </>
  );
}
