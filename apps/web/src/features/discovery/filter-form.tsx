import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  FILTER_DELIVERY_MODES,
  SORT_OPTIONS,
  type DirectoryQuery,
} from "@/lib/api/discovery";
import { OPPORTUNITY_TYPES } from "@/lib/api/opportunities";
import {
  deliveryModeLabel,
  opportunityTypeLabel,
} from "@/lib/opportunity-labels";

// A plain GET form: filtering works without JavaScript and every filter
// state has a shareable URL.
export function FilterForm({ query }: { query: DirectoryQuery }) {
  return (
    <form
      method="get"
      action="/opportunities"
      aria-label="Filter opportunities"
      className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="filter-q">Keyword</Label>
        <Input
          id="filter-q"
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="e.g. solar, scholarship"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-category">Category</Label>
        <NativeSelect
          id="filter-category"
          name="category"
          defaultValue={query.category ?? ""}
        >
          <option value="">All categories</option>
          {OPPORTUNITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {opportunityTypeLabel(type)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-location">Location</Label>
        <Input
          id="filter-location"
          type="text"
          name="location"
          defaultValue={query.location ?? ""}
          placeholder="e.g. Awgu, Enugu"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-delivery">Delivery</Label>
        <NativeSelect
          id="filter-delivery"
          name="delivery_mode"
          defaultValue={query.delivery_mode ?? ""}
        >
          <option value="">Any</option>
          {FILTER_DELIVERY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {deliveryModeLabel(mode)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-sort">Sort</Label>
        <NativeSelect
          id="filter-sort"
          name="sort"
          defaultValue={query.sort ?? "relevance"}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit">Apply filters</Button>
        <Link href="/opportunities" className={buttonVariants({ variant: "outline" })}>
          Clear all
        </Link>
      </div>
    </form>
  );
}
