import { apiRequest } from "@/lib/api/client";

export const OPPORTUNITY_TYPES = [
  "training",
  "apprenticeship",
  "scholarship",
  "employment",
  "local_work",
  "contract",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export interface Opportunity {
  id: string;
  organization_id: string;
  opportunity_type: string;
  title: string;
  description: string;
  eligibility: string | null;
  cost_details: string | null;
  pay_details: string | null;
  location: string;
  delivery_mode: string;
  application_route: string;
  external_url: string | null;
  min_age: number | null;
  deadline_at: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityInput {
  organization_id?: string;
  opportunity_type: string;
  title: string;
  description: string;
  location: string;
  eligibility?: string | null;
  cost_details?: string | null;
  deadline_at?: string | null;
  min_age?: number | null;
}

export function createOpportunity(
  input: OpportunityInput,
): Promise<Opportunity> {
  return apiRequest<Opportunity>("/api/v1/opportunities", {
    method: "POST",
    body: input,
    csrf: true,
  });
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${id}`);
}

export function updateOpportunity(
  id: string,
  input: Partial<OpportunityInput>,
): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${id}`, {
    method: "PATCH",
    body: input,
    csrf: true,
  });
}

export function submitOpportunity(id: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${id}/submit`, {
    method: "POST",
    csrf: true,
  });
}
