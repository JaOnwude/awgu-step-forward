import Link from "next/link";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FILTER_DELIVERY_MODES,
  SORT_OPTIONS,
  type DirectoryQuery,
} from "@/lib/api/discovery";
import { OPPORTUNITY_TYPES } from "@/lib/api/opportunities";
import { deliveryModeLabel, opportunityTypeLabel } from "@/lib/opportunity-labels";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground";

// A plain GET form: filtering works without JavaScript and every filter
// state has a shareable URL.
export function FilterForm({ query }: { query: DirectoryQuery }) {
  return (
    <form
      method="get"
      action="/opportunities"
      role="search"
      aria-label="Filter opportunities"
      className="grid gap-2 rounded-3xl border bg-card p-2 shadow-[var(--shadow-soft)] md:grid-cols-[1.5fr_1fr_0.9fr_1fr_auto] md:items-center md:rounded-full md:p-1.5"
    >
      {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
      <label className="flex items-center gap-2.5 px-3 md:px-4">
        <Search aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Keyword</span>
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="e.g. solar, scholarship"
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-2.5 border-t px-3 md:border-t-0 md:border-l md:px-4">
        <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Location</span>
        <input
          type="text"
          name="location"
          defaultValue={query.location ?? ""}
          placeholder="Any town or LGA"
          className={fieldClass}
        />
      </label>
      <label className="border-t px-3 md:border-t-0 md:border-l md:px-4">
        <span className="sr-only">Delivery</span>
        <select name="delivery_mode" defaultValue={query.delivery_mode ?? ""} className={cn(fieldClass, "cursor-pointer")}>
          <option value="">In person or online</option>
          {FILTER_DELIVERY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {deliveryModeLabel(mode)}
            </option>
          ))}
        </select>
      </label>
      <label className="border-t px-3 md:border-t-0 md:border-l md:px-4">
        <span className="sr-only">Sort</span>
        <select name="sort" defaultValue={query.sort ?? "relevance"} className={cn(fieldClass, "cursor-pointer")}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="lg">
        Search
      </Button>
    </form>
  );
}

/** Category chips. Each is a link, so the choice is shareable and works without JS. */
export function CategoryChips({
  query,
  hrefFor,
}: {
  query: DirectoryQuery;
  hrefFor: (category: string | undefined) => string;
}) {
  const options: { value: string | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    ...OPPORTUNITY_TYPES.map((type) => ({ value: type, label: opportunityTypeLabel(type) })),
  ];
  return (
    <nav aria-label="Categories" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {options.map((option) => {
        const active = (query.category ?? undefined) === option.value;
        return (
          <Link
            key={option.label}
            href={hrefFor(option.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "border-foreground bg-foreground text-background hover:bg-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
