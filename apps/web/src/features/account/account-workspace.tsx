"use client";

import { useEffect, useState } from "react";

import { fetchCurrentUser, logout, type UserPublic } from "@/lib/api/auth";
import { fetchProfile, type ApplicantProfile } from "@/lib/api/applicant";
import { describeApiError, isUnauthorized } from "@/lib/api/errors";
import { secondaryButton } from "@/lib/ui";

import { ApplicationsList } from "./applications-list";
import { ProfileForm } from "./profile-form";
import { SavedListings } from "./saved-listings";
import { SignInCard } from "./sign-in-card";

export function AccountWorkspace() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await fetchCurrentUser();
        if (!active) return;
        setUser(current);
        const existing = await fetchProfile();
        if (active) {
          setProfile(existing);
          setProfileLoaded(true);
        }
      } catch (caught) {
        if (active) {
          if (!isUnauthorized(caught)) setError(describeApiError(caught));
          setProfileLoaded(true);
        }
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignedIn(next: UserPublic) {
    setUser(next);
    setError("");
    try {
      const existing = await fetchProfile();
      setProfile(existing);
      setProfileLoaded(true);
    } catch (caught) {
      setError(describeApiError(caught));
    }
  }

  async function handleSignOut() {
    try {
      await logout();
    } catch {
      // Ignore sign-out errors; the UI resets regardless.
    }
    setUser(null);
    setProfile(null);
    setProfileLoaded(false);
  }

  if (checking) {
    return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  }

  return (
    <div className="space-y-8">
      {user ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {user.email ?? user.phone ?? user.id}
              </span>
            </p>
            <button type="button" className={secondaryButton} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </section>
      ) : (
        <SignInCard onSignedIn={handleSignedIn} />
      )}

      {user && profileLoaded ? (
        <ProfileForm profile={profile} onSaved={setProfile} />
      ) : null}

      {user ? (
        <>
          <SavedListings />
          <ApplicationsList />
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
