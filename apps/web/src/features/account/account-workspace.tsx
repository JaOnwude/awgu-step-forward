"use client";

import { ErrorState, SectionSkeleton } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ApplicationsList } from "./applications-list";
import { ProfileForm } from "./profile-form";
import { useCurrentUser, useProfile, useSignOut } from "./queries";
import { SavedListings } from "./saved-listings";
import { SignInCard } from "./sign-in-card";

export function AccountWorkspace() {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const profileQuery = useProfile(Boolean(user));
  const signOut = useSignOut();

  if (userQuery.isPending) {
    return <SectionSkeleton label="Checking your session…" />;
  }

  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />;
  }

  if (!user) {
    return <SignInCard />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {user.email ?? user.phone ?? user.id}
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>

      {profileQuery.isPending ? (
        <SectionSkeleton label="Loading your profile…" />
      ) : profileQuery.isError ? (
        <ErrorState
          error={profileQuery.error}
          onRetry={() => profileQuery.refetch()}
        />
      ) : (
        // Re-mount once the profile is first created so the form switches
        // from "create" to "edit" mode with the server copy as its draft.
        <ProfileForm
          key={profileQuery.data ? "existing" : "new"}
          profile={profileQuery.data}
        />
      )}

      <SavedListings />
      <ApplicationsList />
    </div>
  );
}
