"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchProfile,
  listSaved,
  saveListing,
  unsaveListing,
  updateProfile,
  type ApplicantProfileUpdate,
} from "@/lib/api/applicant";
import {
  fetchApplication,
  listApplications,
  withdrawApplication,
} from "@/lib/api/applications";
import { fetchCurrentUser, logout, type UserPublic } from "@/lib/api/auth";
import { isUnauthorized } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

/** The signed-in user, or `null` when nobody is signed in (401). */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<UserPublic | null> => {
      try {
        return await fetchCurrentUser();
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await logout();
      } catch {
        // Sign-out errors are ignored; local state resets regardless.
      }
    },
    onSettled: () => switchUser(queryClient, null),
  });
}

/**
 * Point the cache at a new session. Every other query is reset (cached private
 * data dropped, active queries refetched) rather than cleared, so components
 * already on screen stay subscribed and re-render.
 */
function switchUser(queryClient: QueryClient, user: UserPublic | null) {
  queryClient.setQueryData(queryKeys.me, user);
  void queryClient.resetQueries({
    predicate: (query) => query.queryKey[0] !== queryKeys.me[0],
  });
}

/** Call after a successful sign-in so every query refetches as that user. */
export function useSignedIn() {
  const queryClient = useQueryClient();
  return (user: UserPublic) => switchUser(queryClient, user);
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplicantProfileUpdate) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
    },
  });
}

export function useSavedListings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.saved,
    queryFn: listSaved,
    enabled,
  });
}

export function useSaveListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      opportunityId,
      saved,
    }: {
      opportunityId: string;
      saved: boolean;
    }): Promise<void> => {
      if (saved) await unsaveListing(opportunityId);
      else await saveListing(opportunityId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved }),
  });
}

export function useApplications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications,
    queryFn: listApplications,
    enabled,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => fetchApplication(id),
  });
}

export function useWithdrawApplication(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => withdrawApplication(id, note),
    onSuccess: (application) => {
      queryClient.setQueryData(queryKeys.application(id), application);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications });
    },
  });
}
