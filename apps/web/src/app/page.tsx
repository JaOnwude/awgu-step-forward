import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Banknote,
  Clock,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import { fetchOpportunityDirectory, type OpportunityCard } from "@/lib/api/discovery";
import { formatWatDate } from "@/lib/format";

const categories = [
  { type: "scholarship", name: "Scholarships", note: "Tuition and study support" },
  { type: "training", name: "Skills & training", note: "Short courses" },
  { type: "apprenticeship", name: "Apprenticeships", note: "Learn on the job" },
  { type: "employment", name: "Jobs", note: "Entry-level vacancies" },
  { type: "local_work", name: "Local paid work", note: "Day work · adults 18+" },
];

const steps = [
  {
    title: "Find",
    body: "Filter by category, town, deadline and pay. Awgu listings come first, then the rest of Enugu State.",
  },
  {
    title: "Apply",
    body: "Apply here or on the provider’s own site. You always see exactly what is shared before you send it.",
  },
  {
    title: "Track",
    body: "Saved listings, drafts, receipts and every dated status change, in one private place.",
  },
];

async function loadFeatured(): Promise<OpportunityCard[] | null> {
  try {
    return (await fetchOpportunityDirectory({ page_size: 3 })).items;
  } catch {
    return null;
  }
}

/** Decorative hills-and-sun illustration (inline SVG: no image download). */
function Hills() {
  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-[62%] w-full"
    >
      <path d="M0 160 C 80 110 150 130 220 100 S 340 70 400 95 V300 H0Z" fill="#0b4836" />
      <path d="M0 210 C 100 170 190 200 270 165 S 370 150 400 160 V300 H0Z" fill="#B8501F" />
      <path d="M0 250 C 110 225 220 245 310 225 S 390 220 400 225 V300 H0Z" fill="#8f3c16" />
    </svg>
  );
}

async function HeroListing() {
  const featured = await loadFeatured();
  const listing = featured?.[0];
  if (!listing) return null;
  return (
    <Link
      href={`/opportunities/${listing.id}`}
      className="relative ml-auto block w-[78%] rounded-2xl bg-card p-4 text-card-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone="verified" icon={ShieldCheck}>
          Verified
        </StatusBadge>
        <span className="text-xs text-muted-foreground">Featured</span>
      </div>
      <p className="mt-2.5 font-display text-lg leading-snug font-semibold">{listing.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {listing.provider?.name} · {listing.location}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="line-clamp-1 text-sm font-semibold text-primary">
          {listing.pay_details ?? listing.cost_details ?? "See details"}
        </span>
        {listing.deadline_at ? (
          <StatusBadge tone="warning" icon={Clock}>
            {formatWatDate(listing.deadline_at)}
          </StatusBadge>
        ) : null}
      </div>
    </Link>
  );
}

function HeroArt() {
  return (
    <div className="relative isolate flex aspect-[4/4.3] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-brand-panel p-6 text-white sm:p-7">
      <Hills />
      <span aria-hidden className="absolute top-7 left-7 grid size-24 place-items-center rounded-full bg-sun/20">
        <span className="size-16 rounded-full bg-sun" />
      </span>
      <Suspense fallback={<Skeleton className="relative ml-auto h-36 w-[78%] rounded-2xl" />}>
        <HeroListing />
      </Suspense>
      <Link
        href="/sessions"
        className="relative flex w-fit items-center gap-3 rounded-2xl bg-card px-4 py-3 text-card-foreground shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
      >
        <span className="grid size-9 place-items-center rounded-[10px] bg-highlight-muted text-highlight">
          <Users aria-hidden className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Free application help</span>
          <span className="block text-xs text-muted-foreground">Support sessions near you</span>
        </span>
      </Link>
    </div>
  );
}

async function FeaturedListings() {
  const featured = await loadFeatured();

  if (featured === null) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-muted p-6">
        <h3 className="font-semibold">We couldn’t load featured listings.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the directory to browse opportunities directly.
        </p>
        <Link href="/opportunities" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Open the directory
        </Link>
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <h3 className="font-semibold">No listings published yet.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified opportunities appear here as providers publish them.
        </p>
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
    <div role="status" aria-live="polite" className="grid gap-5 md:grid-cols-3">
      <span className="sr-only">Loading featured opportunities…</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} aria-hidden className="space-y-3 rounded-2xl border bg-card p-5">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-6 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-14 lg:pb-20">
        <div className="grid gap-7">
          <StatusBadge tone="primary" icon={MapPin}>
            Enugu State · Awgu first
          </StatusBadge>
          <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl lg:text-[4.25rem]">
            Find your next step,{" "}
            <em className="font-normal text-primary">closer to home.</em>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Scholarships, training, apprenticeships, jobs and safe local paid work. Every
            provider is checked by our team before a listing goes live.
          </p>

          <form
            action="/opportunities"
            method="get"
            role="search"
            aria-label="Search opportunities"
            className="grid gap-2 rounded-3xl border bg-card p-2 shadow-[var(--shadow-soft)] sm:grid-cols-[1.3fr_1fr_auto] sm:rounded-full sm:p-1.5"
          >
            <label className="flex items-center gap-2.5 px-3 sm:px-4">
              <Search aria-hidden className="size-5 text-muted-foreground" />
              <span className="sr-only">Keyword</span>
              <input
                name="q"
                placeholder="What are you looking for?"
                className="h-12 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2.5 border-t px-3 sm:border-t-0 sm:border-l sm:px-4">
              <MapPin aria-hidden className="size-5 text-muted-foreground" />
              <span className="sr-only">Location</span>
              <input
                name="location"
                defaultValue="Awgu"
                className="h-12 w-full bg-transparent text-[0.95rem] outline-none"
              />
            </label>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              Providers verified by staff
            </li>
            <li className="flex items-center gap-1.5">
              <Banknote aria-hidden className="size-4 text-primary" />
              Never a fee to apply
            </li>
            <li className="flex items-center gap-1.5">
              <Lock aria-hidden className="size-4 text-primary" />
              Your profile stays private
            </li>
          </ul>
        </div>
        <HeroArt />
      </section>

      {/* Categories */}
      <section className="border-y bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <p className="eyebrow text-highlight">Browse by category</p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">Start where you are</h2>
            </div>
            <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>
              See all opportunities <ArrowRight aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <li key={category.type}>
                <Link
                  href={`/opportunities?category=${category.type}`}
                  className="grid h-full gap-7 rounded-2xl border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CategoryIcon type={category.type} size="lg" />
                  <span>
                    <span className="block font-bold">{category.name}</span>
                    <span className="block text-sm text-muted-foreground">{category.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <p className="eyebrow text-highlight">Closing soon</p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Featured opportunities</h2>
          </div>
          <Link href="/opportunities" className="text-sm font-semibold text-primary hover:underline">
            View all opportunities →
          </Link>
        </div>
        <div className="mt-8">
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedListings />
          </Suspense>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <div className="grid gap-10 border-t pt-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="grid content-start gap-4">
            <p className="eyebrow text-highlight">How it works</p>
            <h2 className="font-display text-4xl font-semibold">
              Find. Apply. <em className="font-normal">Track.</em>
            </h2>
            <p className="text-muted-foreground">
              One place for the whole journey, with an honest record of where every
              application stands.
            </p>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="grid content-start gap-3">
                <span className="font-display text-5xl font-semibold text-highlight">
                  0{index + 1}
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust + sessions */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div id="verification" className="grid scroll-mt-24 content-start gap-4 rounded-3xl bg-muted p-8 sm:p-10">
            <StatusBadge tone="verified" icon={ShieldCheck}>
              Trust &amp; safety
            </StatusBadge>
            <h2 className="font-display text-3xl font-semibold">How verification works</h2>
            <ol className="grid list-decimal gap-2.5 pl-5 text-sm">
              <li>Providers send proof of who they are and a reachable contact.</li>
              <li>A staff member checks every new listing before it is public.</li>
              <li>Changes to pay, deadline or eligibility go back for review.</li>
              <li>Paid construction work is open to verified adults (18+) only.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Verification means our team reviewed the provider. It is not a government
              endorsement or a guaranteed place. Real opportunities never ask for an
              application fee.
            </p>
          </div>
          <div className="grid content-start gap-4 rounded-3xl bg-brand-panel p-8 text-white sm:p-10">
            <span className="inline-flex h-[1.625rem] w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 text-[0.78rem] font-semibold">
              <Users aria-hidden className="size-3.5" /> Free support sessions
            </span>
            <h2 className="font-display text-3xl font-semibold">
              Get help with forms, CVs and interviews
            </h2>
            <p className="text-sm text-white/85">
              Workshops and help desks run by verified local partners in Awgu and across
              Enugu State. These are not health services. Book a place in two taps.
            </p>
            <Link href="/sessions" className={buttonVariants({ variant: "sun", className: "w-fit" })}>
              Find a session <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-8">
          <div className="grid gap-1.5">
            <h2 className="text-xl font-bold">Have an opportunity to share?</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Schools, SMEs, training providers, NGOs and local employers can list
              scholarships, vacancies, apprenticeships and safe paid work. Every listing
              is reviewed first.
            </p>
          </div>
          <Link href="/providers" className={buttonVariants({ variant: "outline" })}>
            List an opportunity <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
