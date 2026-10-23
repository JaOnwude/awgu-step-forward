"use client";

import Link from "next/link";
import { Lock, LogOut } from "lucide-react";

import { ErrorState, SectionSkeleton } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NotificationPreferencesCard,
  NotificationsInbox,
} from "@/features/notifications/notifications-card";
import { useMySessionRegistrations } from "@/features/sessions/queries";
import type { ApplicantProfile } from "@/lib/api/applicant";
import { formatWatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";

import { ApplicationsList } from "./applications-list";
import { MySessions } from "./my-sessions";
import { PasswordCard } from "./password-card";
import { ProfilePhotoCard } from "./profile-photo";
import { ProfileForm } from "./profile-form";
import { useApplications, useCurrentUser, useProfile, useSavedListings, useSignOut } from "./queries";
import { SavedListings } from "./saved-listings";
import { RedirectToSignIn } from "./redirect-to-sign-in";

const PROFILE_FIELDS: (keyof ApplicantProfile)[] = [
  "preferred_name",
  "date_of_birth",
  "lga",
  "community",
  "education_level",
  "interests",
  "skills",
  "experience",
];

function profileCompleteness(profile: ApplicantProfile | null | undefined): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((field) => Boolean(profile[field])).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string | undefined;
  note: string;
}) {
  return (
    <div className="grid gap-1.5 rounded-2xl border bg-card p-5">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="font-display text-4xl leading-none font-semibold">{value ?? "–"}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export function AccountWorkspace() {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const signedIn = Boolean(user);
  const profileQuery = useProfile(signedIn);
  const applications = useApplications(signedIn);
  const saved = useSavedListings(signedIn);
  const sessions = useMySessionRegistrations(signedIn);
  const signOut = useSignOut();

  if (userQuery.isPending) {
    return <SectionSkeleton label="Checking your session…" />;
  }

  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />;
  }

  if (!user) return <RedirectToSignIn next="/account" />;

  const profile = profileQuery.data;
  const name = profile?.preferred_name ?? user.email?.split("@")[0] ?? user.phone ?? "there";
  const completeness = profileCompleteness(profile);
  const apps = applications.data ?? [];
  const drafts = apps.filter((a) => a.status === "draft").length;
  const activeSessions = (sessions.data ?? []).filter((r) => r.status === "registered");
  const nextSession = activeSessions[0]?.session;

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="md" />
          <div className="grid gap-2">
            <p className="eyebrow text-muted-foreground">Welcome back</p>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">Hello, {name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold text-muted-foreground">
            <Lock aria-hidden className="size-3.5" /> Your profile is private
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            <LogOut aria-hidden /> Sign out
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Applications"
          value={applications.data?.length}
          note={`${drafts} draft · ${apps.length - drafts} submitted`}
        />
        <Stat label="Saved" value={saved.data?.length} note="Opportunities to come back to" />
        <Stat
          label="Sessions"
          value={activeSessions.length}
          note={nextSession ? `Next: ${formatWatDate(nextSession.starts_at)}` : "None booked yet"}
        />
        <a
          href="#profile"
          className="grid content-start gap-2 rounded-2xl bg-brand-panel p-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
        >
          <p className="eyebrow text-white/75">Profile</p>
          <p className="text-xl font-bold">{completeness}% complete</p>
          <div className="flex gap-1" aria-hidden>
            {PROFILE_FIELDS.map((field, index) => (
              <span
                key={field}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index < Math.round((completeness / 100) * PROFILE_FIELDS.length) ? "bg-sun" : "bg-white/20",
                )}
              />
            ))}
          </div>
        </a>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid gap-6">
          <NotificationsInbox />
          <ApplicationsList />
          <SavedListings />
          <MySessions />
        </div>
        <div id="profile" className="grid scroll-mt-24 gap-6">
          <ProfilePhotoCard user={user} />
          <PasswordCard user={user} />
          {profileQuery.isPending ? (
            <SectionSkeleton label="Loading your profile…" />
          ) : profileQuery.isError ? (
            <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
          ) : (
            // Re-mount once the profile is first created so the form switches
            // from "create" to "edit" mode with the server copy as its draft.
            <ProfileForm key={profile ? "existing" : "new"} profile={profile} />
          )}
          <NotificationPreferencesCard />
          <div className="grid gap-2 rounded-2xl border border-dashed p-5 text-sm">
            <p className="font-bold">Looking for something new?</p>
            <p className="text-muted-foreground">
              Browse verified opportunities near Awgu, or book a free support session.
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Link href="/opportunities" className={buttonVariants({ size: "sm" })}>
                Browse opportunities
              </Link>
              <Link href="/sessions" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Support sessions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
