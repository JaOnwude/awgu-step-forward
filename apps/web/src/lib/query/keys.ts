/**
 * Query keys for TanStack Query. Keep every key here so invalidation after a
 * mutation is easy to find. Keys never contain personal data.
 */
export const queryKeys = {
  me: ["me"] as const,
  profile: ["applicant", "profile"] as const,
  saved: ["applicant", "saved"] as const,
  applications: ["applications"] as const,
  application: (id: string) => ["applications", id] as const,
  applicationForm: (opportunityId: string) =>
    ["applications", "form", opportunityId] as const,
  myProviders: ["providers", "mine"] as const,
  provider: (id: string) => ["providers", id] as const,
  opportunity: (id: string) => ["opportunities", id] as const,
  session: (id: string) => ["sessions", id] as const,
  mySessionRegistrations: ["sessions", "registrations", "mine"] as const,
  managedSessions: ["sessions", "managed"] as const,
  roster: (id: string) => ["sessions", "roster", id] as const,
  moderationQueue: ["moderation", "queue"] as const,
  adminPing: ["admin", "ping"] as const,
};
