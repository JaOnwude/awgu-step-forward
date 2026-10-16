import { apiRequest } from "@/lib/api/client";

export interface UserPublic {
  id: string;
  email: string | null;
  phone: string | null;
  account_status: string;
  roles: string[];
  created_at: string;
  /** Own profile picture (API-relative, versioned), or null. */
  avatar_url: string | null;
}

export interface LoginResponse {
  user: UserPublic;
  csrf_token: string;
}

export interface AdminPingResponse {
  status: string;
  user_id: string;
  roles: string[];
}

export type OtpChannel = "email" | "phone";

export interface OtpRequestResponse {
  channel: OtpChannel;
  destination: string;
  expires_at: string;
  dev_code: string | null;
}

export function devLogin(email: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/dev-login", {
    method: "POST",
    body: { email },
  });
}

export function requestOtp(
  channel: OtpChannel,
  destination: string,
): Promise<OtpRequestResponse> {
  return apiRequest<OtpRequestResponse>("/api/v1/auth/otp/request", {
    method: "POST",
    body: { channel, destination },
  });
}

export function verifyOtp(
  channel: OtpChannel,
  destination: string,
  code: string,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/otp/verify", {
    method: "POST",
    body: { channel, destination, code },
  });
}

export function fetchCurrentUser(): Promise<UserPublic> {
  return apiRequest<UserPublic>("/api/v1/auth/me");
}

export function logout(): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>("/api/v1/auth/logout", {
    method: "POST",
    csrf: true,
  });
}

/** Upload a profile picture; the server crops, resizes and strips metadata. */
export function uploadAvatar(file: File): Promise<UserPublic> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<UserPublic>("/api/v1/me/avatar", { method: "PUT", body: form, csrf: true });
}

export function removeAvatar(): Promise<UserPublic> {
  return apiRequest<UserPublic>("/api/v1/me/avatar", { method: "DELETE", csrf: true });
}

export function adminPing(): Promise<AdminPingResponse> {
  return apiRequest<AdminPingResponse>("/api/v1/admin/ping");
}
