"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";

import {
  ErrorState,
  InlineError,
  ListSkeleton,
  SectionSkeleton,
} from "@/components/shared/query-states";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser, useSignOut } from "@/features/account/queries";
import { RedirectToSignIn } from "@/features/account/redirect-to-sign-in";
import { OrganizerPanel } from "@/features/sessions/organizer-panel";
import {
  ADULT_ONLY_TYPES,
  OPPORTUNITY_TYPES,
  createOpportunity,
  submitOpportunity,
  type Opportunity,
  type WorkTerms,
} from "@/lib/api/opportunities";
import {
  PROVIDER_TYPES,
  listMyProviders,
  requestProviderAccess,
} from "@/lib/api/providers";
import { opportunityTypeLabel } from "@/lib/opportunity-labels";
import { queryKeys } from "@/lib/query/keys";

type TextTerm = Exclude<keyof WorkTerms, "hazards_reviewed" | "adult_only_construction">;

const WORK_TERM_FIELDS: { key: TextTerm; label: string; long?: boolean }[] = [
  { key: "task_scope", label: "Task and scope", long: true },
  { key: "pay_rate", label: "Pay rate" },
  { key: "payment_timing", label: "When pay is made" },
  { key: "hours_expected", label: "Expected hours" },
  { key: "work_dates", label: "Work dates" },
  { key: "worksite", label: "Worksite area (no exact address)" },
  { key: "supervisor_contact", label: "Named supervisor / contact" },
  { key: "safety_ppe", label: "Safety and PPE provided", long: true },
];

const EMPTY_TERMS: WorkTerms = {
  task_scope: "",
  pay_rate: "",
  payment_timing: "",
  hours_expected: "",
  work_dates: "",
  worksite: "",
  supervisor_contact: "",
  safety_ppe: "",
  hazards_reviewed: false,
  adult_only_construction: false,
};

export function ProviderWorkspace() {
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const signOut = useSignOut();

  const providersQuery = useQuery({
    queryKey: queryKeys.myProviders,
    queryFn: listMyProviders,
    enabled: Boolean(user),
  });
  const providers = providersQuery.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? providers[0]?.id ?? null;
  const selected = providers.find((p) => p.id === activeId) ?? null;
  const canCreate = selected?.verification_status === "verified";

  const [name, setName] = useState("Awgu Skills Centre");
  const [providerType, setProviderType] = useState<string>(PROVIDER_TYPES[2]);
  const [publicContact, setPublicContact] = useState("hello@awgu-skills.test");
  const [operatingArea, setOperatingArea] = useState("Awgu LGA");

  const [title, setTitle] = useState("Solar installation basics");
  const [oppType, setOppType] = useState<string>(OPPORTUNITY_TYPES[0]);
  const [description, setDescription] = useState(
    "Hands-on training for young people across Awgu. No prior experience needed.",
  );
  const [location, setLocation] = useState("Awgu");
  const [costDetails, setCostDetails] = useState("Free");
  const [terms, setTerms] = useState<WorkTerms>(EMPTY_TERMS);
  const [listing, setListing] = useState<Opportunity | null>(null);

  const isWork = ADULT_ONLY_TYPES.includes(oppType);

  const requestAccess = useMutation({
    mutationFn: () =>
      requestProviderAccess({
        name: name.trim(),
        provider_type: providerType,
        public_contact: publicContact.trim(),
        operating_area: operatingArea.trim(),
      }),
    onSuccess: (created) => {
      setSelectedId(created.id);
      return queryClient.invalidateQueries({ queryKey: queryKeys.myProviders });
    },
  });

  const createDraft = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a provider first.");
      const trimmedTerms = Object.fromEntries(
        Object.entries(terms).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() || null : value,
        ]),
      ) as Partial<WorkTerms>;
      return createOpportunity({
        organization_id: selected.id,
        opportunity_type: oppType,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        cost_details: isWork ? null : costDetails.trim() || null,
        pay_details: isWork ? terms.pay_rate?.trim() || null : null,
        work_terms: isWork || terms.adult_only_construction ? trimmedTerms : null,
      });
    },
    onSuccess: setListing,
  });

  const submitDraft = useMutation({
    mutationFn: (id: string) => submitOpportunity(id),
    onSuccess: setListing,
  });

  if (userQuery.isPending) return <SectionSkeleton label="Checking your session…" />;
  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />;
  }
  if (!user) return <RedirectToSignIn next="/providers" />;

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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">My providers</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => providersQuery.refetch()}
              disabled={providersQuery.isFetching}
            >
              <RefreshCw
                aria-hidden
                className={providersQuery.isFetching ? "animate-spin" : ""}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {providersQuery.isPending ? (
            <ListSkeleton rows={1} label="Loading your providers…" />
          ) : providersQuery.isError ? (
            <ErrorState
              error={providersQuery.error}
              onRetry={() => providersQuery.refetch()}
            />
          ) : providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No providers yet. Submit a provider request below.
            </p>
          ) : (
            <ul className="grid gap-3">
              {providers.map((provider) => (
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
                  <div className="flex items-center gap-3">
                    <VerificationBadge status={provider.verification_status} />
                    <Button
                      type="button"
                      variant={activeId === provider.id ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={activeId === provider.id}
                      onClick={() => setSelectedId(provider.id)}
                    >
                      {activeId === provider.id ? "Selected" : "Select"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold">Request provider access</h2>
          <CardDescription>
            An administrator verifies the organization before it can list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              requestAccess.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="provider-name">Legal or common name</Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="provider-type">Provider type</Label>
              <NativeSelect
                id="provider-type"
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              >
                {PROVIDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="provider-contact">Public contact</Label>
              <Input
                id="provider-contact"
                value={publicContact}
                onChange={(e) => setPublicContact(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="provider-area">Operating area</Label>
              <Input
                id="provider-area"
                value={operatingArea}
                onChange={(e) => setOperatingArea(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={requestAccess.isPending}>
                Submit request
              </Button>
              {requestAccess.isSuccess ? (
                <span role="status" className="text-sm text-muted-foreground">
                  Request submitted. An administrator must verify it.
                </span>
              ) : null}
            </div>
          </form>
          <InlineError error={requestAccess.error} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold">Listing draft</h2>
          {!canCreate ? (
            <CardDescription>
              Select a verified provider to create a listing. Unverified providers
              cannot publish.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4">
          {canCreate ? (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createDraft.mutate();
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="listing-title">Title</Label>
                <Input
                  id="listing-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-type">Type</Label>
                <NativeSelect
                  id="listing-type"
                  value={oppType}
                  onChange={(e) => setOppType(e.target.value)}
                >
                  {OPPORTUNITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {opportunityTypeLabel(type)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <Label htmlFor="listing-description">Description</Label>
                <Textarea
                  id="listing-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-location">Location</Label>
                <Input
                  id="listing-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              {!isWork ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="listing-cost">Cost details</Label>
                  <Input
                    id="listing-cost"
                    value={costDetails}
                    onChange={(e) => setCostDetails(e.target.value)}
                  />
                </div>
              ) : null}

              {isWork ? (
                <fieldset className="grid gap-4 rounded-lg border border-border p-4 md:col-span-2 md:grid-cols-2">
                  <legend className="px-1 text-sm font-medium">Work terms</legend>
                  <Alert className="md:col-span-2">
                    <ShieldAlert aria-hidden />
                    <AlertTitle>Adults only (18+)</AlertTitle>
                    <AlertDescription>
                      Paid work listings are open to adults only. Vague “labour
                      wanted” posts are not approved — state the task, pay, hours,
                      supervisor and safety arrangements.
                    </AlertDescription>
                  </Alert>
                  {WORK_TERM_FIELDS.map((field) => {
                    const id = `terms-${field.key}`;
                    const value = terms[field.key] ?? "";
                    const onChange = (next: string) =>
                      setTerms((current) => ({ ...current, [field.key]: next }));
                    return (
                      <div
                        key={field.key}
                        className={`grid gap-1.5 ${field.long ? "md:col-span-2" : ""}`}
                      >
                        <Label htmlFor={id}>{field.label}</Label>
                        {field.long ? (
                          <Textarea
                            id={id}
                            rows={2}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                          />
                        ) : (
                          <Input
                            id={id}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms-hazards"
                      checked={terms.hazards_reviewed}
                      onCheckedChange={(state) =>
                        setTerms((current) => ({
                          ...current,
                          hazards_reviewed: state === true,
                        }))
                      }
                    />
                    <Label htmlFor="terms-hazards" className="font-normal">
                      Site hazards have been reviewed
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms-construction"
                      checked={terms.adult_only_construction}
                      onCheckedChange={(state) =>
                        setTerms((current) => ({
                          ...current,
                          adult_only_construction: state === true,
                        }))
                      }
                    />
                    <Label htmlFor="terms-construction" className="font-normal">
                      This is construction-site work
                    </Label>
                  </div>
                </fieldset>
              ) : null}

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button type="submit" disabled={createDraft.isPending}>
                  Create draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => listing && submitDraft.mutate(listing.id)}
                  disabled={!listing || listing.status !== "draft" || submitDraft.isPending}
                >
                  Submit for review
                </Button>
              </div>
            </form>
          ) : null}

          <InlineError error={createDraft.error ?? submitDraft.error} />

          {listing ? (
            <div className="rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{listing.title}</p>
                <ListingStatusBadge status={listing.status} />
              </div>
              {listing.min_age ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Minimum age {listing.min_age}
                </p>
              ) : null}
              {listing.decision_reason ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Reviewer note: {listing.decision_reason}
                </p>
              ) : null}
              {listing.status === "pending_review" ? (
                <p role="status" className="mt-2 text-sm text-muted-foreground">
                  Submitted. A staff member will review it.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <OrganizerPanel organizationId={activeId} canPropose={canCreate} />
    </div>
  );
}
