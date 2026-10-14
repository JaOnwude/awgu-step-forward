"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelSessionRegistration,
  fetchRoster,
  fetchSession,
  listManagedSessions,
  listMySessionRegistrations,
  proposeSession,
  recordAttendance,
  registerForSession,
  type SessionInput,
} from "@/lib/api/sessions";
import { queryKeys } from "@/lib/query/keys";

export function useMySessionRegistrations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.mySessionRegistrations,
    queryFn: listMySessionRegistrations,
    enabled,
  });
}

/** Live seat count for a session page (the server-rendered count may be stale). */
export function useSession(id: string) {
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: () => fetchSession(id),
  });
}

function useInvalidateSession(id: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.session(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.mySessionRegistrations }),
    ]);
}

export function useRegisterForSession(id: string) {
  const invalidate = useInvalidateSession(id);
  return useMutation({
    mutationFn: (reminderOptIn: boolean) => registerForSession(id, reminderOptIn),
    onSettled: invalidate,
  });
}

export function useCancelSessionRegistration(id: string) {
  const invalidate = useInvalidateSession(id);
  return useMutation({
    mutationFn: () => cancelSessionRegistration(id),
    onSettled: invalidate,
  });
}

export function useManagedSessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.managedSessions,
    queryFn: listManagedSessions,
    enabled,
  });
}

export function useProposeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionInput) => proposeSession(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.managedSessions }),
  });
}

export function useRoster(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.roster(id),
    queryFn: () => fetchRoster(id),
    enabled,
    // Rosters hold registrant names; never keep a stale copy around.
    gcTime: 0,
  });
}

export function useRecordAttendance(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      registrationId,
      attendance,
    }: {
      registrationId: string;
      attendance: "unknown" | "attended" | "absent";
    }) => recordAttendance(sessionId, registrationId, attendance),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.roster(sessionId) }),
  });
}
