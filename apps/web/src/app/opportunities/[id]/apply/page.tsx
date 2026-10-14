import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplyFlow } from "@/features/discovery/apply-flow";
import { fetchOpportunityDetail } from "@/lib/api/discovery";
import { buttonVariants } from "@/components/ui/button";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const opportunity = await fetchOpportunityDetail(id);
    if (!opportunity) return { title: "Apply — Awgu StepForward" };
    return {
      title: `Apply: ${opportunity.title} — Awgu StepForward`,
      robots: { index: false },
    };
  } catch {
    return { title: "Apply — Awgu StepForward" };
  }
}

export default async function ApplyPage({ params }: { params: Params }) {
  const { id } = await params;

  let opportunity = null;
  let failed = false;
  try {
    opportunity = await fetchOpportunityDetail(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-muted p-6">
          <h1 className="font-medium">We couldn’t load this listing.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The directory service did not respond. Please try again.
          </p>
          <Link href="/opportunities" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            Back to opportunities
          </Link>
        </div>
      </section>
    );
  }

  if (!opportunity) notFound();

  const canApply = opportunity.application_route === "platform" && !opportunity.is_expired;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/opportunities/${opportunity.id}`}
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Back to listing
      </Link>
      <header className="mt-5 grid gap-2">
        <p className="eyebrow text-highlight">Apply in-platform · free</p>
        <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
          {opportunity.title}
        </h1>
        <p className="text-muted-foreground">{opportunity.provider?.name ?? "Provider"}</p>
      </header>

      <div className="mt-8">
        {canApply ? (
          <ApplyFlow
            opportunityId={opportunity.id}
            opportunityTitle={opportunity.title}
            providerName={opportunity.provider?.name ?? "the provider"}
          />
        ) : (
          <div className="rounded-2xl border border-warning/40 bg-warning-muted p-6">
            <p className="font-medium">This listing cannot be applied to here.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {opportunity.is_expired
                ? "The deadline has passed."
                : "This opportunity uses a different application route."}
            </p>
            <Link
              href={`/opportunities/${opportunity.id}`}
              className={buttonVariants({ variant: "outline", className: "mt-4" })}
            >
              View listing details
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
