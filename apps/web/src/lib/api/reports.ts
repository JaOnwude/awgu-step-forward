import { apiRequest } from "@/lib/api/client";

export const REPORT_CATEGORIES = [
  { value: "fee_request", label: "They asked for money to apply", urgent: true },
  { value: "fraud", label: "Looks like a scam or fake", urgent: true },
  { value: "unsafe", label: "Unsafe work or a safety concern", urgent: true },
  { value: "harassment", label: "Harassment or threats", urgent: true },
  { value: "discrimination", label: "Unfair or discriminatory", urgent: false },
  { value: "inaccurate", label: "Wrong or misleading details", urgent: false },
  { value: "expired", label: "No longer available", urgent: false },
  { value: "other", label: "Something else", urgent: false },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];
export type ReportTarget = "opportunity" | "support_session";

export interface ReportReceipt {
  id: string;
  message: string;
}

export interface StaffReport {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  target_title: string;
  category: ReportCategory;
  details: string | null;
  urgent: boolean;
  status: string;
  age_hours: number;
  overdue: boolean;
  signed_in_reporter: boolean;
  resolution: string | null;
  resolution_note: string | null;
  created_at: string;
}

export type ReportAction = "resolve" | "dismiss" | "suspend_target";

export function submitReport(input: {
  target_type: ReportTarget;
  target_id: string;
  category: ReportCategory;
  details: string | null;
}): Promise<ReportReceipt> {
  // csrf: true sends the token when signed in; anonymous reports work too.
  return apiRequest<ReportReceipt>("/api/v1/reports", { method: "POST", csrf: true, body: input });
}

export function decideReport(id: string, action: ReportAction, note: string): Promise<StaffReport> {
  return apiRequest<StaffReport>(
    `/api/v1/admin/moderation/reports/${encodeURIComponent(id)}/decision`,
    { method: "POST", csrf: true, body: { action, note } },
  );
}

export function reportCategoryLabel(value: string): string {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
