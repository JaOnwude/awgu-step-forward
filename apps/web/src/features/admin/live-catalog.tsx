"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
} from "@/components/shared/query-states";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWatDate, formatWatDateTime } from "@/lib/format";
import { decideSession, type SessionDecision } from "@/lib/api/sessions";
import {
  decideListing,
  decideProvider,
  fetchModerationCatalog,
  type ModerationCatalog,
  type ListingDecision,
  type ProviderDecision,
} from "@/lib/api/moderation";
import { opportunityTypeLabel } from "@/lib/opportunity-labels";
import { queryKeys } from "@/lib/query/keys";

interface Action<D> {
  decision: D;
  label: string;
  destructive?: boolean;
}

/** One row: what the item is, a reason box, and the allowed actions. */
function CatalogRow<D extends string>({
  id,
  title,
  meta,
  badge,
  note,
  actions,
  reasonHint,
  busy,
  onDecide,
}: {
  id: string;
  title: string;
  meta: string;
  badge: React.ReactNode;
  note?: string | null;
  actions: Action<D>[];
  reasonHint: string;
  busy: boolean;
  onDecide: (decision: D, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonId = `catalog-reason-${id}`;
  return (
    <li className="grid gap-3 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
        {badge}
      </div>
      {note ? <p className="text-sm text-muted-foreground">Last decision: {note}</p> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor={reasonId}>Reason ({reasonHint})</Label>
          <Input id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        {actions.map((action) => (
          <Button
            key={action.decision}
            type="button"
            size="sm"
            variant={action.destructive ? "destructive" : "outline"}
            disabled={busy}
            onClick={() => onDecide(action.decision, reason.trim())}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * Published and suspended listings, sessions and providers (spec R20): staff
 * can suspend or expire what is live, and restore what was suspended.
 */
export function LiveCatalog() {
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: queryKeys.moderationCatalog,
    queryFn: fetchModerationCatalog,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.moderationCatalog }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderationQueue }),
    ]);

  const listing = useMutation({
    mutationFn: (v: { id: string; decision: ListingDecision; reason: string }) =>
      decideListing(v.id, v.decision, v.reason || null),
    onSuccess: refresh,
  });
  const provider = useMutation({
    mutationFn: (v: { id: string; decision: ProviderDecision; reason: string }) =>
      decideProvider(v.id, v.decision, v.reason),
    onSuccess: refresh,
  });
  const session = useMutation({
    mutationFn: (v: { id: string; decision: SessionDecision; reason: string }) =>
      decideSession(v.id, v.decision, v.reason || null),
    onSuccess: refresh,
  });
  // Missing lists count as empty: during a deploy the web app can briefly talk
  // to an older API that does not return every list yet.
  const data = {
    live_listings: [],
    suspended_listings: [],
    live_sessions: [],
    suspended_sessions: [],
    verified_providers: [],
    suspended_providers: [],
    ...catalog.data,
  } satisfies ModerationCatalog;

  const busyId = listing.isPending
    ? listing.variables?.id
    : provider.isPending
      ? provider.variables?.id
      : session.isPending
        ? session.variables?.id
        : undefined;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Published listings, sessions &amp; providers</h2>
        <CardDescription>
          Suspend or close what is live, and restore what was suspended. Every action is
          written to the audit log. Suspending a provider also suspends its live listings
          and sessions; after restoring the provider, restore each listing separately.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {catalog.isPending ? (
          <ListSkeleton rows={2} label="Loading published items…" />
        ) : catalog.isError ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
        ) : (
          <Tabs defaultValue="live">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="live">Live listings ({data.live_listings.length})</TabsTrigger>
              <TabsTrigger value="suspended">
                Suspended listings ({data.suspended_listings.length})
              </TabsTrigger>
              <TabsTrigger value="sessions">
                Sessions (
                {data.live_sessions.length + data.suspended_sessions.length})
              </TabsTrigger>
              <TabsTrigger value="providers">
                Providers (
                {data.verified_providers.length + data.suspended_providers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-3">
              {data.live_listings.length === 0 ? (
                <Empty>No live listings.</Empty>
              ) : (
                <ul className="grid gap-3">
                  {data.live_listings.map((item) => (
                    <CatalogRow<ListingDecision>
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      meta={`${opportunityTypeLabel(item.opportunity_type)} · ${item.location}${
                        item.deadline_at ? ` · closes ${formatWatDate(item.deadline_at)}` : ""
                      }`}
                      badge={<ListingStatusBadge status={item.status} />}
                      reasonHint="required to suspend, optional to close"
                      actions={[
                        { decision: "expire", label: "Close now" },
                        { decision: "suspend", label: "Suspend", destructive: true },
                      ]}
                      busy={busyId === item.id}
                      onDecide={(decision, reason) =>
                        listing.mutate({ id: item.id, decision, reason })
                      }
                    />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="suspended" className="mt-3">
              {data.suspended_listings.length === 0 ? (
                <Empty>No suspended listings.</Empty>
              ) : (
                <ul className="grid gap-3">
                  {data.suspended_listings.map((item) => (
                    <CatalogRow<ListingDecision>
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      meta={`${opportunityTypeLabel(item.opportunity_type)} · ${item.location}`}
                      badge={<ListingStatusBadge status={item.status} />}
                      note={item.decision_reason}
                      reasonHint="required"
                      actions={[{ decision: "restore", label: "Restore" }]}
                      busy={busyId === item.id}
                      onDecide={(decision, reason) =>
                        listing.mutate({ id: item.id, decision, reason })
                      }
                    />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="mt-3">
              {data.live_sessions.length + data.suspended_sessions.length ===
              0 ? (
                <Empty>No upcoming or suspended sessions.</Empty>
              ) : (
                <ul className="grid gap-3">
                  {[...data.suspended_sessions, ...data.live_sessions].map(
                    (item) => {
                      const suspended = item.status === "suspended";
                      return (
                        <CatalogRow<SessionDecision>
                          key={item.id}
                          id={item.id}
                          title={item.topic}
                          meta={`${item.provider?.name ?? "Unknown provider"} · ${formatWatDateTime(item.starts_at)} · ${item.registered_count} registered`}
                          badge={<ListingStatusBadge status={item.status} />}
                          note={suspended ? item.decision_reason : null}
                          reasonHint="required"
                          actions={
                            suspended
                              ? [{ decision: "restore", label: "Restore" }]
                              : [{ decision: "suspend", label: "Suspend", destructive: true }]
                          }
                          busy={busyId === item.id}
                          onDecide={(decision, reason) =>
                            session.mutate({ id: item.id, decision, reason })
                          }
                        />
                      );
                    },
                  )}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="providers" className="mt-3">
              <ul className="grid gap-3">
                {[...data.suspended_providers, ...data.verified_providers].map(
                  (item) => {
                    const suspended = item.verification_status === "suspended";
                    return (
                      <CatalogRow<ProviderDecision>
                        key={item.id}
                        id={item.id}
                        title={item.name}
                        meta={`${item.provider_type.replace(/_/g, " ")} · ${item.operating_area}`}
                        badge={<VerificationBadge status={item.verification_status} />}
                        reasonHint="required"
                        actions={
                          suspended
                            ? [{ decision: "restore", label: "Restore provider" }]
                            : [{ decision: "suspend", label: "Suspend provider", destructive: true }]
                        }
                        busy={busyId === item.id}
                        onDecide={(decision, reason) =>
                          provider.mutate({ id: item.id, decision, reason })
                        }
                      />
                    );
                  },
                )}
              </ul>
            </TabsContent>
          </Tabs>
        )}
        <InlineError error={listing.error ?? provider.error ?? session.error} />
      </CardContent>
    </Card>
  );
}
