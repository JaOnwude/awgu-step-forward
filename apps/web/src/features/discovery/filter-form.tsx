import Link from "next/link";

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
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/lib/ui";

export function FilterForm({ query }: { query: DirectoryQuery }) {
  return (
    <form
      method="get"
      action="/opportunities"
      aria-label="Filter opportunities"
      className="grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className={labelClass}>
        <span className="font-medium">Keyword</span>
        <input
          className={inputClass}
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="e.g. solar, scholarship"
        />
      </label>

      <label className={labelClass}>
        <span className="font-medium">Category</span>
        <select className={inputClass} name="category" defaultValue={query.category ?? ""}>
          <option value="">All categories</option>
          {OPPORTUNITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {opportunityTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span className="font-medium">Location</span>
        <input
          className={inputClass}
          type="text"
          name="location"
          defaultValue={query.location ?? ""}
          placeholder="e.g. Awgu, Enugu"
        />
      </label>

      <label className={labelClass}>
        <span className="font-medium">Delivery</span>
        <select
          className={inputClass}
          name="delivery_mode"
          defaultValue={query.delivery_mode ?? ""}
        >
          <option value="">Any</option>
          {FILTER_DELIVERY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {deliveryModeLabel(mode)}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span className="font-medium">Sort</span>
        <select className={inputClass} name="sort" defaultValue={query.sort ?? "relevance"}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
        <button type="submit" className={primaryButton}>
          Apply filters
        </button>
        <Link href="/opportunities" className={secondaryButton}>
          Clear all
        </Link>
      </div>
    </form>
  );
}
