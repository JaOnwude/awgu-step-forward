import Link from "next/link";
import { Suspense } from "react";

import { AdminCheck } from "@/features/demo/admin-check";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import {
  fetchOpportunityDirectory,
  type OpportunityCard,
} from "@/lib/api/discovery";
import { buttonVariants } from "@/components/ui/button";

const categories = [
  { name: "Scholarships", note: "Tuition and study support" },
  { name: "Skills & training", note: "Short courses and certifications" },
  { name: "Apprenticeships", note: "Learn on the job" },
  { name: "Jobs", note: "Entry-level vacancies" },
  { name: "Local paid work", note: "Day-labour and community projects" },
];

const steps = [
  {
    title: "Find",
    body: "Search verified opportunities, prioritising Awgu, then widen to the rest of Enugu State.",
  },
  {
    title: "Apply",
    body: "Use an in-platform form for supported listings, or open the provider's own site safely.",
  },
  {
    title: "Track",
    body: "Keep saved listings, drafts, receipts, and status history in one private place.",
  },
];

async function FeaturedListings() {
  let featured: OpportunityCard[] = [];
  let failed = false;
  try {
    const data = await fetchOpportunityDirectory({ page_size: 3 });
    featured = data.items;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/40 bg-danger/5 p-6"
      >
        <h3 className="font-medium">We couldn’t load featured listings.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the directory to browse opportunities directly.
        </p>
        <Link
          href="/opportunities"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          Open the directory
        </Link>
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <h3 className="font-medium">No listings published yet.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified opportunities appear here as providers publish them.
        </p>
        <Link
          href="/opportunities"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          Browse the directory
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {featured.map((opportunity) => (
        <OpportunityCardView key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="h-5 w-32 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-primary-muted px-3 py-1 text-xs font-medium text-primary">
              Enugu State · Awgu prioritised
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Find your next step, closer to home
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Awgu StepForward is a verified opportunity directory and
              application tracker for learning, work, and safe local paid work.
              Every listing is reviewed before it appears.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/opportunities"
                className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse opportunities
              </Link>
              <a
                href="#for-providers"
                className="rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                List an opportunity
              </a>
            </div>
          </div>

          <div
            id="opportunities"
            className="rounded-2xl border border-border bg-background p-6"
          >
            <h2 className="text-sm font-medium text-muted-foreground">
              Opportunity categories
            </h2>
            <ul className="mt-4 grid gap-3">
              {categories.map((category) => (
                <li
                  key={category.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {category.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured listings
            </h2>
            <p className="text-sm text-muted-foreground">
              Verified opportunities, with Awgu prioritised.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all opportunities →
          </Link>
        </div>

        <div className="mt-6">
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedListings />
          </Suspense>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Find, apply, track
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border bg-background p-6"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="support-sessions"
        className="mx-auto w-full max-w-6xl px-4 py-16"
      >
        <div className="grid gap-8 md:grid-cols-2">
          <div id="for-providers" className="rounded-2xl border border-border bg-surface p-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              For providers and SMEs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Submit scholarships, vacancies, apprenticeships, or safe local paid
              work. A staff member reviews every listing before it goes live.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Application-support sessions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Free, practical help with scholarship forms, CVs, interview
              practice, and digital skills. These are workshops and help desks,
              not health services.
            </p>
            <Link
              href="/sessions"
              className={buttonVariants({ variant: "outline", className: "mt-4" })}
            >
              Find a session
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-background p-8">
          <h3 className="text-lg font-medium">Staying safe</h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Verification means a staff member reviewed the provider; it is never
            a government endorsement or a guarantee of success. Applications are
            private. Watch for requests for payment or personal documents that a
            listing did not ask for, and report anything suspicious.
          </p>
        </div>
      </section>

      <section id="demo" className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Day-1 vertical slice check
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This panel talks to the FastAPI backend using cookie sessions. Sign
            in as the seeded admin, then call a role-protected endpoint.
          </p>
          <div className="mt-6">
            <AdminCheck />
          </div>
        </div>
      </section>
    </>
  );
}
