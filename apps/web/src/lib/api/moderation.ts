import { apiRequest } from "@/lib/api/client";
import type { Opportunity } from "@/lib/api/opportunities";
import type { ProviderSummary } from "@/lib/api/providers";
import type { StaffReport } from "@/lib/api/reports";
import type { ManagedSession } from "@/lib/api/sessions";

export type ProviderDecision = "approve" | "reject";
export type ListingDecision =
  | "approve"
  | "reject"
  | "request_changes"
  | "suspend";

export interface ModerationQueue {
  providers: ProviderSummary[];
  listings: Opportunity[];
  sessions: ManagedSession[];
  reports: StaffReport[];
}

export function fetchModerationQueue(): Promise<ModerationQueue> {
  return apiRequest<ModerationQueue>("/api/v1/admin/moderation/queue");
}

export function decideProvider(
  id: string,
  decision: ProviderDecision,
  rationale: string,
  recheckDays?: number | null,
): Promise<ProviderSummary> {
  return apiRequest<ProviderSummary>(
    `/api/v1/admin/moderation/providers/${id}/verification`,
    {
      method: "POST",
      body: {
        decision,
        rationale,
        recheck_days: recheckDays ?? null,
      },
      csrf: true,
    },
  );
}

export function decideListing(
  id: string,
  decision: ListingDecision,
  reason?: string | null,
): Promise<Opportunity> {
  return apiRequest<Opportunity>(
    `/api/v1/admin/moderation/listings/${id}/decision`,
    {
      method: "POST",
      body: { decision, reason: reason ?? null },
      csrf: true,
    },
  );
}
