import { apiRequest } from "@/lib/api/client";

export interface CountItem {
  key: string;
  count: number;
}

export interface WeekPoint {
  /** Monday of the week, as an ISO date. */
  week_start: string;
  count: number;
}

/** Aggregate counts for the staff impact dashboard. No personal data. */
export interface ImpactStats {
  generated_at: string;
  /** True while synthetic demo activity is in the database. */
  includes_demo_data: boolean;
  listings: {
    live: number;
    live_in_awgu: number;
    closing_soon: number;
    pending_review: number;
    public_announcements: number;
    by_category: CountItem[];
  };
  providers: { verified: number; pending: number; suspended: number };
  people: {
    applicants: number;
    with_profile: number;
    from_awgu: number;
    by_town: CountItem[];
    saved_listings: number;
  };
  applications: {
    total: number;
    last_30_days: number;
    in_platform: number;
    tracked_elsewhere: number;
    positive_outcomes: number;
    by_status: CountItem[];
    weekly: WeekPoint[];
  };
  sessions: { upcoming: number; held: number; registrations: number; attended: number };
  trust: {
    reports_open: number;
    reports_urgent_open: number;
    reports_resolved: number;
    listings_suspended: number;
    reminders_sent: number;
  };
}

export function fetchImpactStats(): Promise<ImpactStats> {
  return apiRequest<ImpactStats>("/api/v1/admin/impact");
}
