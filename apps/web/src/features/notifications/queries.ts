"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotifications,
  fetchPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  savePreferences,
  type PreferencesInput,
} from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    enabled,
    // Light polling so the header bell picks up new reminders.
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | "all") =>
      id === "all" ? markAllNotificationsRead() : markNotificationRead(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function usePreferences(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: fetchPreferences,
    enabled,
  });
}

export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PreferencesInput) => savePreferences(input),
    onSuccess: (prefs) => queryClient.setQueryData(queryKeys.notificationPrefs, prefs),
  });
}
