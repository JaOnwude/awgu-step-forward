import { env } from "@/lib/env";
import type { WorkTerms } from "@/lib/api/opportunities";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match (Awgu first)" },
  { value: "deadline", label: "Closing soonest" },
  { value: "newest", label: "Newest" },
] as const;

export const FILTER_DELIVERY_MODES = ["onsite", "hybrid", "remote"] as const;

export interface ProviderRef {
  id: string;
  name: string;
  verification_status: string;
  verified_at: string | null;
  public_contact: string | null;
}

export interface OpportunityCard {
  id: string;
  organization_id: string;
  opportunity_type: string;
  title: string;
  location: string;
  delivery_mode: string;
  cost_details: string | null;
  pay_details: string | null;
  deadline_at: string | null;
  status: string;
  is_expired: boolean;
  is_closing_soon: boolean;
  image_url: string | null;
  is_featured: boolean;
  /** Set when the listing was copied from a public announcement. */
  source_url: string | null;
  updated_at: string;
  provider: ProviderRef | null;
}

export interface OpportunityDetail extends OpportunityCard {
  description: string;
  eligibility: string | null;
  application_route: string;
  external_url: string | null;
  min_age: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  decision_reason: string | null;
  work_terms: WorkTerms | null;
}

export interface OpportunityListResponse {
  items: OpportunityCard[];
  total: number;
  page: number;
  page_size: number;
}

export interface DirectoryQuery {
  q?: string;
  category?: string;
  location?: string;
  delivery_mode?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

function toQueryString(query: DirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.location) params.set("location", query.location);
  if (query.delivery_mode) params.set("delivery_mode", query.delivery_mode);
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.page_size && query.page_size !== 12) {
    params.set("page_size", String(query.page_size));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchOpportunityDirectory(
  query: DirectoryQuery,
): Promise<OpportunityListResponse> {
  const response = await fetch(
    `${env.apiBaseUrl}/api/v1/opportunities${toQueryString(query)}`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`Directory request failed with status ${response.status}`);
  }
  return (await response.json()) as OpportunityListResponse;
}

export async function fetchOpportunityDetail(
  id: string,
): Promise<OpportunityDetail | null> {
  const response = await fetch(
    `${env.apiBaseUrl}/api/v1/opportunities/${encodeURIComponent(id)}`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (response.status === 404 || response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Listing request failed with status ${response.status}`);
  }
  return (await response.json()) as OpportunityDetail;
}
