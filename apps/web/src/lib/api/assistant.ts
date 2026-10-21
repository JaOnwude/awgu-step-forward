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
  /** "claude:<model>" or "rule-based-interpreter-v1". */
  engine: string;
  /** True when Claude was unavailable and keyword rules answered instead. */
  fell_back: boolean;
  disclaimer: string;
}

/** Plain-language name for the engine that read the request. */
export function engineLabel(engine: string): string {
  return engine.startsWith("claude:") ? "Claude (AI)" : "simple keyword rules";
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
