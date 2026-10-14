import { apiRequest } from "@/lib/api/client";
import type { OpportunityCard } from "@/lib/api/discovery";

export interface AssistantStatus {
  enabled: boolean;
  engine: string;
  notice: string;
}

export interface AssistantFilters {
  category: string | null;
  location: string | null;
  delivery_mode: string | null;
  q: string | null;
}

export interface AssistantResult {
  filters: AssistantFilters;
  explanation: string[];
  redacted: boolean;
  relaxed: boolean;
  items: OpportunityCard[];
  total: number;
  engine: string;
  disclaimer: string;
}

export function fetchAssistantStatus(): Promise<AssistantStatus> {
  return apiRequest<AssistantStatus>("/api/v1/opportunity-assistant/status");
}

export function askAssistant(query: string): Promise<AssistantResult> {
  return apiRequest<AssistantResult>("/api/v1/opportunity-assistant/search", {
    method: "POST",
    body: { query },
  });
}
