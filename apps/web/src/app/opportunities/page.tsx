import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { AssistantPanel } from "@/features/discovery/assistant-panel";
import { CategoryChips, FilterForm } from "@/features/discovery/filter-form";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import {
  fetchOpportunityDirectory,
  type DirectoryQuery,
  type OpportunityListResponse,
} from "@/lib/api/discovery";
import { deliveryModeLabel, opportunityTypeLabel } from "@/lib/opportunity-labels";

export const metadata: Metadata = {
  title: "Opportunities — Awgu StepForward",
  description:
    "Browse verified scholarships, training, apprenticeships, jobs, and local paid work across Enugu State, with Awgu prioritised.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildHref(query: DirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.location) params.set("location", query.location);
  if (query.delivery_mode) params.set("delivery_mode", query.delivery_mode);
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/opportunities?${qs}` : "/opportunities";
}

function hrefWithout(query: DirectoryQuery, key: keyof DirectoryQuery): string {
  return buildHref({ ...query, [key]: undefined, page: undefined });
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const query: DirectoryQuery = {
    q: first(sp.q)?.trim() || undefined,
    category: first(sp.category) || undefined,
    location: first(sp.location)?.trim() || undefined,
    delivery_mode: first(sp.delivery_mode) || undefined,
    sort: first(sp.sort) || undefined,
    page: Number.parseInt(first(sp.page) ?? "1", 10) || 1,
  };

  let data: OpportunityListResponse | null = null;
  let failed = false;
  try {
    data = await fetchOpportunityDirectory(query);
  } catch {
    failed = true;
  }

  const activeFilters: { key: keyof DirectoryQuery; label: string }[] = [];
  if (query.q) activeFilters.push({ key: "q", label: `“${query.q}”` });
  if (query.location) activeFilters.push({ key: "location", label: query.location });
  if (query.delivery_mode) {
    activeFilters.push({ key: "delivery_mode", label: deliveryModeLabel(query.delivery_mode) });
  }

  const heading = query.category
    ? opportunityTypeLabel(query.category)
    : query.location
      ? `Opportunities near ${query.location}`
      : "Find your next step";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="grid max-w-3xl gap-1.5">
        <p className="eyebrow text-highlight">Verified opportunities</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          Across Enugu State, with Awgu listings first. Browsing needs no account — sign in
          only to save or apply.
        </p>
      </header>

      <div className="mt-6 grid gap-3">
        <FilterForm query={query} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryChips
            query={query}
            hrefFor={(category) => buildHref({ ...query, category, page: undefined })}
          />
        </div>
        <AssistantPanel />
      </div>

      {failed ? (
        <div role="alert" className="mt-8 rounded-2xl border border-danger/40 bg-danger-muted p-6">
          <h2 className="font-semibold">We couldn’t load opportunities.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The directory service did not respond. Check your connection and try again.
          </p>
          <Link href={buildHref(query)} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            Try again
          </Link>
        </div>
      ) : null}

      {!failed && data ? (
        <DirectoryResults query={query} data={data} activeFilters={activeFilters} />
      ) : null}
    </section>
  );
}

function DirectoryResults({
  query,
  data,
  activeFilters,
}: {
  query: DirectoryQuery;
  data: OpportunityListResponse;
  activeFilters: { key: keyof DirectoryQuery; label: string }[];
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));
  const page = data.page;

  return (
    <div className="mt-8 grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{data.total}</span>{" "}
          {data.total === 1 ? "opportunity" : "opportunities"}
          {activeFilters.length > 0 || query.category ? " match your search" : " open now"}
        </p>
        {activeFilters.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <li key={filter.key}>
                <Link
                  href={hrefWithout(query, filter.key)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {filter.label}
                  <X aria-hidden className="size-3.5" />
                  <span className="sr-only">Remove filter</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/opportunities" className="text-sm font-semibold text-primary hover:underline">
                Clear all
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-6" />
          </span>
          <h2 className="font-display text-2xl font-semibold">Nothing matches yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a wider location, a different category, or clear your filters. New
            opportunities are added as providers are verified.
          </p>
          <Link href="/opportunities" className={buttonVariants({ variant: "outline", className: "mt-2" })}>
            Clear all filters
          </Link>
        </div>
      ) : (
        <>
          {/* Keeps the heading order h1 → h2 → h3 (each card title is an h3). */}
          <h2 className="sr-only">Results</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((opportunity) => (
              <OpportunityCardView key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
              {page > 1 ? (
                <Link href={buildHref({ ...query, page: page - 1 })} className={buttonVariants({ variant: "outline" })}>
                  Previous
                </Link>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref({ ...query, page: page + 1 })} className={buttonVariants({ variant: "outline" })}>
                  Next
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
