import { apiRequest } from "@/lib/api/client";

export const PROVIDER_TYPES = [
  "organization",
  "school",
  "training_provider",
  "ngo",
  "public_program",
  "sme",
  "individual_employer",
  "household",
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface ProviderSummary {
  id: string;
  name: string;
  provider_type: string;
  operating_area: string;
  verification_status: string;
  verified_at: string | null;
  created_at: string;
}

export interface ProviderMember {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
}

export interface ProviderDetail extends ProviderSummary {
  public_contact: string;
  recheck_at: string | null;
  members: ProviderMember[];
}

export interface ProviderRequestInput {
  name: string;
  provider_type: string;
  public_contact: string;
  operating_area: string;
  evidence_type?: string | null;
  evidence_reference?: string | null;
}

export function listMyProviders(): Promise<ProviderSummary[]> {
  return apiRequest<ProviderSummary[]>("/api/v1/providers");
}

export function getProvider(id: string): Promise<ProviderDetail> {
  return apiRequest<ProviderDetail>(`/api/v1/providers/${id}`);
}

export function requestProviderAccess(
  input: ProviderRequestInput,
): Promise<ProviderSummary> {
  return apiRequest<ProviderSummary>("/api/v1/providers", {
    method: "POST",
    body: input,
    csrf: true,
  });
}
