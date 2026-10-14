import { apiRequest } from "@/lib/api/client";

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  deadline_reminders: boolean;
  session_reminders: boolean;
  marketing_opt_in: boolean;
  email_available: boolean;
  sms_available: boolean;
}

export type PreferencesInput = Omit<NotificationPreferences, "email_available" | "sms_available">;

export interface InAppNotification {
  id: string;
  purpose: string;
  subject: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationList {
  items: InAppNotification[];
  unread: number;
}

export function fetchPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/api/v1/me/notification-preferences");
}

export function savePreferences(input: PreferencesInput): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/api/v1/me/notification-preferences", {
    method: "PUT",
    csrf: true,
    body: input,
  });
}

export function fetchNotifications(): Promise<NotificationList> {
  return apiRequest<NotificationList>("/api/v1/me/notifications");
}

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/me/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    csrf: true,
  });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>("/api/v1/me/notifications/read-all", { method: "POST", csrf: true });
}

export function runReminderJob(): Promise<{ deadline_reminders: number; session_reminders: number }> {
  return apiRequest("/api/v1/admin/jobs/reminders", { method: "POST", csrf: true });
}
