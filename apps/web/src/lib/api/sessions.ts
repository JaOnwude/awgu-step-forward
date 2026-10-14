import { apiRequest } from "@/lib/api/client";
import { env } from "@/lib/env";

export const SESSION_DELIVERY_MODES = ["onsite", "remote", "hybrid"] as const;

export interface SessionProvider {
  id: string;
  name: string;
  verification_status: string;
}

export interface SupportSession {
  id: string;
  organization_id: string;
  provider: SessionProvider | null;
  topic: string;
  description: string;
  starts_at: string;
  ends_at: string;
  delivery_mode: string;
  location: string;
  capacity: number;
  seats_left: number;
  is_full: boolean;
  has_started: boolean;
  accessibility_notes: string | null;
  age_suitability: string;
  organizer_contact: string;
  status: string;
}

export interface ManagedSession extends SupportSession {
  registered_count: number;
  decision_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface SessionListResponse {
  items: SupportSession[];
  total: number;
  page: number;
  page_size: number;
}

export interface SessionRegistration {
  id: string;
  session_id: string;
  status: "registered" | "cancelled";
  attendance: "unknown" | "attended" | "absent";
  reminder_opt_in: boolean;
  registered_at: string;
  cancelled_at: string | null;
}

export interface MySessionRegistration extends SessionRegistration {
  session: SupportSession;
}

export interface RosterEntry {
  registration_id: string;
  preferred_name: string;
  status: string;
  attendance: string;
  registered_at: string;
}

export interface Roster {
  session: ManagedSession;
  entries: RosterEntry[];
}

export interface SessionInput {
  organization_id?: string;
  topic: string;
  description: string;
  starts_at: string;
  ends_at: string;
  delivery_mode: string;
  location: string;
  capacity: number;
  accessibility_notes?: string | null;
  organizer_contact: string;
}

const BASE = "/api/v1/application-support-sessions";

// --- Server-side public reads (no cookies) ---------------------------------

export async function fetchPublicSessions(page = 1): Promise<SessionListResponse> {
  const qs = page > 1 ? `?page=${page}` : "";
  const response = await fetch(`${env.apiBaseUrl}${BASE}${qs}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Sessions request failed with status ${response.status}`);
  }
  return (await response.json()) as SessionListResponse;
}

export async function fetchPublicSession(id: string): Promise<SupportSession | null> {
  const response = await fetch(`${env.apiBaseUrl}${BASE}/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if ([401, 403, 404, 422].includes(response.status)) return null;
  if (!response.ok) {
    throw new Error(`Session request failed with status ${response.status}`);
  }
  return (await response.json()) as SupportSession;
}

// --- Browser calls (session cookie + CSRF) ---------------------------------

export function fetchSession(id: string): Promise<SupportSession> {
  return apiRequest<SupportSession>(`${BASE}/${encodeURIComponent(id)}`);
}

export function registerForSession(
  id: string,
  reminderOptIn: boolean,
): Promise<SessionRegistration> {
  return apiRequest<SessionRegistration>(
    `${BASE}/${encodeURIComponent(id)}/registrations`,
    { method: "POST", csrf: true, body: { reminder_opt_in: reminderOptIn } },
  );
}

export function cancelSessionRegistration(id: string): Promise<SessionRegistration> {
  return apiRequest<SessionRegistration>(
    `${BASE}/${encodeURIComponent(id)}/registrations/cancel`,
    { method: "POST", csrf: true },
  );
}

export function listMySessionRegistrations(): Promise<MySessionRegistration[]> {
  return apiRequest<MySessionRegistration[]>("/api/v1/me/session-registrations");
}

export function proposeSession(input: SessionInput): Promise<ManagedSession> {
  return apiRequest<ManagedSession>(BASE, { method: "POST", csrf: true, body: input });
}

export function listManagedSessions(): Promise<ManagedSession[]> {
  return apiRequest<ManagedSession[]>(`${BASE}/manage`);
}

export function fetchRoster(id: string): Promise<Roster> {
  return apiRequest<Roster>(`${BASE}/${encodeURIComponent(id)}/roster`);
}

export function recordAttendance(
  sessionId: string,
  registrationId: string,
  attendance: "unknown" | "attended" | "absent",
): Promise<SessionRegistration> {
  return apiRequest<SessionRegistration>(
    `${BASE}/${encodeURIComponent(sessionId)}/registrations/${encodeURIComponent(registrationId)}`,
    { method: "PATCH", csrf: true, body: { attendance } },
  );
}

export type SessionDecision = "approve" | "reject" | "suspend";

export function decideSession(
  id: string,
  decision: SessionDecision,
  reason: string | null,
): Promise<ManagedSession> {
  return apiRequest<ManagedSession>(
    `/api/v1/admin/moderation/sessions/${encodeURIComponent(id)}/decision`,
    { method: "POST", csrf: true, body: { decision, reason } },
  );
}

const deliveryLabels: Record<string, string> = {
  onsite: "In person",
  remote: "Online",
  hybrid: "In person or online",
};

export function sessionDeliveryLabel(value: string): string {
  return deliveryLabels[value] ?? value;
}
