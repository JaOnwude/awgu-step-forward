import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationDetailView } from "@/features/account/application-detail";

export const metadata: Metadata = {
  title: "Application — Awgu StepForward",
  description: "Your application receipt and status history.",
};

type Params = Promise<{ id: string }>;

export default async function ApplicationDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Back to your account
      </Link>
      <div className="mt-6">
        <ApplicationDetailView id={id} />
      </div>
    </section>
  );
}
