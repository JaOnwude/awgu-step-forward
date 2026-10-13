"use client";

import { useState } from "react";

import { describeApiError } from "@/lib/api/errors";
import { devLogin, logout, type UserPublic } from "@/lib/api/auth";
import {
  createOpportunity,
  submitOpportunity,
  OPPORTUNITY_TYPES,
  type Opportunity,
} from "@/lib/api/opportunities";
import {
  listMyProviders,
  requestProviderAccess,
  PROVIDER_TYPES,
  type ProviderSummary,
} from "@/lib/api/providers";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import {
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "@/lib/ui";

interface Status {
  kind: "idle" | "busy" | "ok" | "error";
  message: string;
}

const IDLE: Status = { kind: "idle", message: "" };

export function ProviderWorkspace() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [email, setEmail] = useState("provider@awgu.local");
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(IDLE);

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
  const [listing, setListing] = useState<Opportunity | null>(null);

  const selected = providers.find((p) => p.id === selectedId) ?? null;
  const canCreate = selected?.verification_status === "verified";

  async function refreshProviders() {
    const rows = await listMyProviders();
    setProviders(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
    return rows;
  }

  async function handleSignIn() {
    setStatus({ kind: "busy", message: "Signing in…" });
    try {
      const current = await devLogin(email.trim().toLowerCase());
      setUser(current.user);
      await refreshProviders();
      setStatus({ kind: "ok", message: "Signed in." });
    } catch (error) {
      setUser(null);
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleSignOut() {
    setStatus({ kind: "busy", message: "Signing out…" });
    try {
      await logout();
      setUser(null);
      setProviders([]);
      setSelectedId(null);
      setListing(null);
      setStatus({ kind: "ok", message: "Signed out." });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleRequestAccess() {
    setStatus({ kind: "busy", message: "Submitting provider request…" });
    try {
      const created = await requestProviderAccess({
        name: name.trim(),
        provider_type: providerType,
        public_contact: publicContact.trim(),
        operating_area: operatingArea.trim(),
      });
      await refreshProviders();
      setSelectedId(created.id);
      setStatus({
        kind: "ok",
        message: "Provider request submitted. An administrator must verify it.",
      });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleCreateListing() {
    if (!selected) return;
    setStatus({ kind: "busy", message: "Creating draft…" });
    try {
      const created = await createOpportunity({
        organization_id: selected.id,
        opportunity_type: oppType,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        cost_details: costDetails.trim() || null,
      });
      setListing(created);
      setStatus({ kind: "ok", message: "Draft created." });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  async function handleSubmitListing() {
    if (!listing) return;
    setStatus({ kind: "busy", message: "Submitting for review…" });
    try {
      const updated = await submitOpportunity(listing.id);
      setListing(updated);
      setStatus({ kind: "ok", message: "Submitted. A staff member will review it." });
    } catch (error) {
      setStatus({ kind: "error", message: describeApiError(error) });
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-medium">Session</h2>
        {user ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
              {user.roles.length ? ` · ${user.roles.join(", ")}` : ""}
            </p>
            <button type="button" className={secondaryButton} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className={labelClass}>
              <span className="text-muted-foreground">Development email</span>
              <input
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="off"
              />
            </label>
            <button type="button" className={primaryButton} onClick={handleSignIn}>
              Sign in
            </button>
          </div>
        )}
      </section>

      {user ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">My providers</h2>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => void refreshProviders()}
              >
                Refresh
              </button>
            </div>
            {providers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No providers yet. Submit a provider request below.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {providers.map((provider) => (
                  <li
                    key={provider.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider.provider_type} · {provider.operating_area}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <VerificationBadge status={provider.verification_status} />
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => setSelectedId(provider.id)}
                      >
                        {selectedId === provider.id ? "Selected" : "Select"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-medium">Request provider access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              An administrator verifies the organization before it can list.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                <span className="text-muted-foreground">Legal or common name</span>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className={labelClass}>
                <span className="text-muted-foreground">Provider type</span>
                <select
                  className={inputClass}
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                >
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                <span className="text-muted-foreground">Public contact</span>
                <input
                  className={inputClass}
                  value={publicContact}
                  onChange={(e) => setPublicContact(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span className="text-muted-foreground">Operating area</span>
                <input
                  className={inputClass}
                  value={operatingArea}
                  onChange={(e) => setOperatingArea(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className={`mt-4 ${primaryButton}`}
              onClick={handleRequestAccess}
            >
              Submit request
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-medium">Listing draft</h2>
            {!canCreate ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Select a verified provider to create a listing. Unverified
                providers cannot publish.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    <span className="text-muted-foreground">Title</span>
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className={labelClass}>
                    <span className="text-muted-foreground">Type</span>
                    <select
                      className={inputClass}
                      value={oppType}
                      onChange={(e) => setOppType(e.target.value)}
                    >
                      {OPPORTUNITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    <span className="text-muted-foreground">Description</span>
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                  <label className={labelClass}>
                    <span className="text-muted-foreground">Location</span>
                    <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} />
                  </label>
                  <label className={labelClass}>
                    <span className="text-muted-foreground">Cost details</span>
                    <input className={inputClass} value={costDetails} onChange={(e) => setCostDetails(e.target.value)} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className={primaryButton} onClick={handleCreateListing}>
                    Create draft
                  </button>
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={handleSubmitListing}
                    disabled={!listing || listing.status !== "draft"}
                  >
                    Submit for review
                  </button>
                </div>
              </>
            )}

            {listing ? (
              <div className="mt-5 rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{listing.title}</p>
                  <ListingStatusBadge status={listing.status} />
                </div>
                {listing.decision_reason ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Reviewer note: {listing.decision_reason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${
          status.kind === "error" ? "text-danger" : "text-muted-foreground"
        }`}
      >
        {status.message}
      </p>
    </div>
  );
}
