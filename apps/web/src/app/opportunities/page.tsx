import type { Metadata } from "next";
import Link from "next/link";

import { FilterForm } from "@/features/discovery/filter-form";
import { OpportunityCardView } from "@/features/discovery/opportunity-card";
import {
  fetchOpportunityDirectory,
  type DirectoryQuery,
  type OpportunityListResponse,
} from "@/lib/api/discovery";
import { deliveryModeLabel, opportunityTypeLabel } from "@/lib/opportunity-labels";
import { secondaryButton } from "@/lib/ui";

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
  if (query.category) {
    activeFilters.push({ key: "category", label: opportunityTypeLabel(query.category) });
  }
  if (query.location) activeFilters.push({ key: "location", label: query.location });
  if (query.delivery_mode) {
    activeFilters.push({
      key: "delivery_mode",
      label: deliveryModeLabel(query.delivery_mode),
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Find your next step
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verified opportunities across Enugu State, with Awgu prioritised.
          Browsing needs no account — sign in only when you want to save or
          apply.
        </p>
      </header>

      <div className="mt-8">
        <FilterForm query={query} />
      </div>

      {failed ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl border border-danger/40 bg-danger/5 p-6"
        >
          <h2 className="font-medium">We couldn’t load opportunities.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The directory service did not respond. Check your connection and try
            again.
          </p>
          <Link href={buildHref(query)} className={`mt-4 inline-block ${secondaryButton}`}>
            Try again
          </Link>
        </div>
      ) : null}

      {!failed && data ? (
        <DirectoryResults
          query={query}
          data={data}
          activeFilters={activeFilters}
        />
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
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? "opportunity" : "opportunities"}
          {activeFilters.length > 0 ? " matching your filters" : ""}
        </p>
        {activeFilters.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <li key={filter.key}>
                <Link
                  href={hrefWithout(query, filter.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium hover:text-foreground"
                >
                  {filter.label}
                  <span aria-hidden>×</span>
                  <span className="sr-only">Remove filter</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/opportunities" className="text-xs font-medium text-primary">
                Clear all
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-medium">No opportunities match your search.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a wider location, a different category, or clear your filters.
          </p>
          <Link href="/opportunities" className={`mt-4 inline-block ${secondaryButton}`}>
            Clear all filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((opportunity) => (
              <OpportunityCardView key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between gap-4"
            >
              {page > 1 ? (
                <Link
                  href={buildHref({ ...query, page: page - 1 })}
                  className={secondaryButton}
                >
                  Previous
                </Link>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildHref({ ...query, page: page + 1 })}
                  className={secondaryButton}
                >
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
