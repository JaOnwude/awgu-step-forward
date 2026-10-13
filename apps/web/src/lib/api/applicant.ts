import { apiRequest, ApiError } from "@/lib/api/client";

export const APPLICANT_EDUCATION_LEVELS = [
  "primary",
  "secondary",
  "vocational",
  "undergraduate",
  "graduate",
  "other",
] as const;

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  vocational: "Vocational / trade",
  undergraduate: "Undergraduate",
  graduate: "Graduate",
  other: "Other",
};

export const AGE_BAND_LABELS: Record<string, string> = {
  under_18: "Under 18",
  "18_24": "18–24",
  "25_34": "25–34",
  "35_49": "35–49",
  "50_plus": "50+",
};

export interface ApplicantProfile {
  preferred_name: string;
  date_of_birth: string;
  age_band: string;
  is_minor: boolean;
  lga: string | null;
  community: string | null;
  education_level: string | null;
  interests: string | null;
  skills: string | null;
  experience: string | null;
  updated_at: string;
}

export interface ApplicantProfileUpdate {
  preferred_name: string;
  date_of_birth: string;
  lga?: string | null;
  community?: string | null;
  education_level?: string | null;
  interests?: string | null;
  skills?: string | null;
  experience?: string | null;
}

export interface SavedListing {
  id: string;
  opportunity_id: string;
  title: string;
  location: string;
  opportunity_type: string;
  is_expired: boolean;
  saved_at: string;
}

export async function fetchProfile(): Promise<ApplicantProfile | null> {
  try {
    return await apiRequest<ApplicantProfile>("/api/v1/me/profile");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function updateProfile(
  payload: ApplicantProfileUpdate,
): Promise<ApplicantProfile> {
  return apiRequest<ApplicantProfile>("/api/v1/me/profile", {
    method: "PUT",
    csrf: true,
    body: payload,
  });
}

export function listSaved(): Promise<SavedListing[]> {
  return apiRequest<SavedListing[]>("/api/v1/me/saved");
}

export function saveListing(opportunityId: string): Promise<SavedListing> {
  return apiRequest<SavedListing>("/api/v1/me/saved", {
    method: "POST",
    csrf: true,
    body: { opportunity_id: opportunityId },
  });
}

export function unsaveListing(opportunityId: string): Promise<void> {
  return apiRequest<void>(
    `/api/v1/me/saved/${encodeURIComponent(opportunityId)}`,
    { method: "DELETE", csrf: true },
  );
}
