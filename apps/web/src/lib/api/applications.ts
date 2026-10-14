import { apiRequest } from "@/lib/api/client";

export interface FormQuestion {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
}

export interface ApplicationForm {
  opportunity_id: string;
  form_version: string;
  questions: FormQuestion[];
}

export interface ApplicationAnswer {
  question_key: string;
  answer_value: string | null;
}

export interface ApplicationAnswerInput {
  question_key: string;
  answer_value: string | null;
}

export interface ApplicationStatusEvent {
  from_status: string | null;
  to_status: string;
  source: string;
  note: string | null;
  created_at: string;
}

export interface ApplicationSummary {
  id: string;
  reference: string;
  opportunity_id: string;
  opportunity_title: string;
  /** "platform" (submitted here) or "external" / "in_person" (tracked by you). */
  route: string;
  status: string;
  status_source: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  form_version: string;
  private_note: string | null;
  answers: ApplicationAnswer[];
  history: ApplicationStatusEvent[];
}

/** Statuses you can report for an application made outside StepForward. */
export const TRACKING_STATUSES = [
  "started",
  "submitted",
  "interview",
  "offered",
  "accepted",
  "rejected",
  "withdrawn",
  "completed",
] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export function isTracked(application: Pick<ApplicationSummary, "route">): boolean {
  return application.route !== "platform";
}

export function startTracking(opportunityId: string): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>("/api/v1/applications/tracked", {
    method: "POST",
    csrf: true,
    body: { opportunity_id: opportunityId },
  });
}

export function updateTracking(
  id: string,
  status: TrackingStatus,
  privateNote: string | null,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(
    `/api/v1/applications/${encodeURIComponent(id)}/tracking`,
    { method: "PATCH", csrf: true, body: { status, private_note: privateNote } },
  );
}

export interface ApplicationReceipt {
  id: string;
  reference: string;
  status: string;
  submitted_at: string | null;
  message: string;
}

export function fetchApplicationForm(
  opportunityId: string,
): Promise<ApplicationForm> {
  return apiRequest<ApplicationForm>(
    `/api/v1/applications/form/${encodeURIComponent(opportunityId)}`,
  );
}

export function createApplication(
  opportunityId: string,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>("/api/v1/applications", {
    method: "POST",
    csrf: true,
    body: { opportunity_id: opportunityId },
  });
}

export function listApplications(): Promise<ApplicationSummary[]> {
  return apiRequest<ApplicationSummary[]>("/api/v1/applications");
}

export function fetchApplication(id: string): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(
    `/api/v1/applications/${encodeURIComponent(id)}`,
  );
}

export function updateApplicationAnswers(
  id: string,
  answers: ApplicationAnswerInput[],
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(
    `/api/v1/applications/${encodeURIComponent(id)}`,
    { method: "PATCH", csrf: true, body: { answers } },
  );
}

export function submitApplication(
  id: string,
  idempotencyKey: string,
): Promise<ApplicationReceipt> {
  return apiRequest<ApplicationReceipt>(
    `/api/v1/applications/${encodeURIComponent(id)}/submit`,
    {
      method: "POST",
      csrf: true,
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );
}

export function withdrawApplication(
  id: string,
  note?: string,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(
    `/api/v1/applications/${encodeURIComponent(id)}/withdraw`,
    { method: "POST", csrf: true, body: { note: note ?? null } },
  );
}
