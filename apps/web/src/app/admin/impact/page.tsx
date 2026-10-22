import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ImpactDashboard } from "@/features/admin/impact-dashboard";

export const metadata: Metadata = {
  title: "Impact dashboard — Awgu StepForward",
  description: "Reach, applications, outcomes and trust figures for staff and partners.",
  robots: { index: false },
};

export default function ImpactPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
      >
        <ChevronLeft aria-hidden className="size-4" /> Review queue
      </Link>
      <header className="mt-4 grid gap-2">
        <p className="eyebrow text-highlight">Staff workspace</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Impact dashboard</h1>
        <p className="max-w-2xl text-muted-foreground">
          Who we reach, what they apply for and how it turns out. Share it with partners: it
          shows counts only, never names or contacts.
        </p>
      </header>
      <div className="mt-8">
        <ImpactDashboard />
      </div>
    </section>
  );
}
