"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

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
  updateTracking,
  withdrawApplication,
  type TrackingStatus,
} from "@/lib/api/applications";
import { deleteAccount, fetchCurrentUser, logout, type UserPublic } from "@/lib/api/auth";
import { isUnauthorized } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

const subscribeNoop = () => () => {};

/** False during server render and hydration, true once the client has taken over. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * The signed-in user, or `null` when nobody is signed in (401).
 *
 * Pages stream in pieces, so another component (the header) may already have
 * loaded the user before this one hydrates. Until hydration finishes we
 * report "pending" — the same thing the server rendered — to avoid a
 * hydration mismatch; the real value follows on the next render.
 */
export function useCurrentUser() {
  const hydrated = useHydrated();
  const query = useQuery({
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
  if (hydrated) return query;
  // A proxy (not a spread) keeps TanStack's tracked-property optimisation.
  return new Proxy(query, {
    get(target, prop, receiver) {
      if (prop in PENDING_VIEW) return PENDING_VIEW[prop as keyof typeof PENDING_VIEW];
      return Reflect.get(target, prop, receiver);
    },
  });
}

const PENDING_VIEW = {
  data: undefined,
  error: null,
  status: "pending",
  isPending: true,
  isSuccess: false,
  isError: false,
} as const;

// When someone signs out on a page that needs an account, that page would
// otherwise send them to sign in before our own redirect lands. Pages check
// this (see RedirectToSignIn) and stand aside for a moment.
let signedOutAt = 0;

export function justSignedOut(): boolean {
  return Date.now() - signedOutAt < 3000;
}

/**
 * Sign out, confirm it with a message, and go to `redirectTo` (the home page
 * by default; `null` stays on the current page).
 */
export function useSignOut({ redirectTo = "/" }: { redirectTo?: string | null } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      try {
        await logout();
      } catch {
        // Sign-out errors are ignored; local state resets regardless.
      }
    },
    onSettled: () => {
      if (redirectTo) signedOutAt = Date.now();
      switchUser(queryClient, null);
      toast("You're signed out", { description: "See you next time." });
      if (redirectTo) router.replace(redirectTo);
    },
  });
}

/** Delete the account, then leave the app signed out on the home page. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      signedOutAt = Date.now();
      switchUser(queryClient, null);
      toast("Your account has been deleted", {
        description: "Your profile, applications and saved listings are gone.",
      });
      router.replace("/");
    },
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

export function useUpdateTracking(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: TrackingStatus; note: string | null }) =>
      updateTracking(id, status, note),
    onSuccess: (application) => {
      queryClient.setQueryData(queryKeys.application(id), application);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications, exact: true });
    },
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
