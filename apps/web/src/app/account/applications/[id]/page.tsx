import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ApplicationDetailView } from "@/features/account/application-detail";

export const metadata: Metadata = {
  title: "Application — Awgu StepForward",
  description: "Your application receipt and status history.",
};

type Params = Promise<{ id: string }>;

async function ApplicationDetail({ params }: { params: Params }) {
  const { id } = await params;
  return <ApplicationDetailView id={id} />;
}

export default function ApplicationDetailPage({ params }: { params: Params }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Back to your account
      </Link>
      <div className="mt-6">
        {/* The URL id is read inside Suspense so the shell renders instantly. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading application…</p>}>
          <ApplicationDetail params={params} />
        </Suspense>
      </div>
    </section>
  );
}
