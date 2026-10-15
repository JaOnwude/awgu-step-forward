"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
  SectionSkeleton,
} from "@/components/shared/query-states";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { LiveCatalog } from "@/features/admin/live-catalog";
import { ReminderJobCard, ReportReview } from "@/features/admin/report-review";
import { SessionReview } from "@/features/admin/session-review";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser, useSignOut, useSignedIn } from "@/features/account/queries";
import { devLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  decideListing,
  decideProvider,
  fetchModerationQueue,
  type ListingDecision,
  type ProviderDecision,
} from "@/lib/api/moderation";
import { queryKeys } from "@/lib/query/keys";

const STAFF_ROLES = new Set(["admin", "super_admin"]);

function DevStaffSignIn() {
  const [email, setEmail] = useState("admin@awgu.local");
  const signedIn = useSignedIn();
  const signIn = useMutation({
    mutationFn: () => devLogin(email.trim().toLowerCase()),
    onSuccess: (result) => signedIn(result.user),
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Staff sign-in</h2>
        <CardDescription>Development only: sign in as a seeded staff account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            signIn.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="staff-email">Development email</Label>
            <Input
              id="staff-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={signIn.isPending}>
            Sign in
          </Button>
        </form>
        <InlineError error={signIn.error} />
      </CardContent>
    </Card>
  );
}

export function ModerationQueue() {
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const isStaff = Boolean(user?.roles.some((role) => STAFF_ROLES.has(role)));
  const signOut = useSignOut();

  const queueQuery = useQuery({
    queryKey: queryKeys.moderationQueue,
    queryFn: fetchModerationQueue,
    enabled: isStaff,
  });

  const [rationale, setRationale] = useState("Registration and public contact confirmed.");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const refreshQueue = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.moderationQueue });

  const providerDecision = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ProviderDecision }) =>
      decideProvider(id, decision, rationale),
    onSuccess: refreshQueue,
  });
  const listingDecision = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ListingDecision }) =>
      decideListing(id, decision, reasons[id] ?? null),
    onSuccess: refreshQueue,
  });

  const busyId = providerDecision.isPending
    ? providerDecision.variables?.id
    : listingDecision.isPending
      ? listingDecision.variables?.id
      : undefined;

  if (userQuery.isPending) return <SectionSkeleton label="Checking your session…" />;
  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />;
  }
  if (!user) return <DevStaffSignIn />;

  const queue = queueQuery.data ?? { providers: [], listings: [], sessions: [], reports: [] };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email ?? user.id}</span>
            {user.roles.length ? ` · ${user.roles.join(", ")}` : ""}
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

      {!isStaff ? (
        <ErrorState
          title="Staff access only"
          error={
            new ApiError(403, "forbidden", "This workspace is for platform administrators.")
          }
        />
      ) : queueQuery.isPending ? (
        <ListSkeleton rows={3} label="Loading moderation queue…" />
      ) : queueQuery.isError ? (
        <ErrorState error={queueQuery.error} onRetry={() => queueQuery.refetch()} />
      ) : (
        <>
          <ReportReview reports={queue.reports} />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Provider verification queue</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => queueQuery.refetch()}
                  disabled={queueQuery.isFetching}
                >
                  <RefreshCw aria-hidden className={queueQuery.isFetching ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="verification-rationale">Verification rationale</Label>
                <Input
                  id="verification-rationale"
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                />
              </div>
              {queue.providers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No providers awaiting verification.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {queue.providers.map((provider) => (
                    <li
                      key={provider.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {provider.provider_type} · {provider.operating_area}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <VerificationBadge status={provider.verification_status} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === provider.id}
                          onClick={() =>
                            providerDecision.mutate({ id: provider.id, decision: "approve" })
                          }
                        >
                          Verify
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={busyId === provider.id}
                          onClick={() =>
                            providerDecision.mutate({ id: provider.id, decision: "reject" })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <InlineError error={providerDecision.error} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">Listing review queue</h2>
              <CardDescription>
                Approve, request changes, reject, or suspend each submitted listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {queue.listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No listings awaiting review.</p>
              ) : (
                <ul className="grid gap-4">
                  {queue.listings.map((listing) => {
                    const reasonId = `reason-${listing.id}`;
                    const decide = (decision: ListingDecision) =>
                      listingDecision.mutate({ id: listing.id, decision });
                    return (
                      <li
                        key={listing.id}
                        className="grid gap-3 rounded-xl border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{listing.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {listing.opportunity_type} · {listing.location}
                            </p>
                          </div>
                          <ListingStatusBadge status={listing.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{listing.description}</p>
                        <div className="grid gap-1.5">
                          <Label htmlFor={reasonId}>
                            Reason (required for changes, reject, suspend)
                          </Label>
                          <Input
                            id={reasonId}
                            value={reasons[listing.id] ?? ""}
                            onChange={(event) =>
                              setReasons((current) => ({
                                ...current,
                                [listing.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === listing.id}
                            onClick={() => decide("approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === listing.id}
                            onClick={() => decide("request_changes")}
                          >
                            Request changes
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busyId === listing.id}
                            onClick={() => decide("reject")}
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busyId === listing.id}
                            onClick={() => decide("suspend")}
                          >
                            Suspend
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <InlineError error={listingDecision.error} />
            </CardContent>
          </Card>

          <SessionReview sessions={queue.sessions} />

          <LiveCatalog />

          <ReminderJobCard />
        </>
      )}
    </div>
  );
}
