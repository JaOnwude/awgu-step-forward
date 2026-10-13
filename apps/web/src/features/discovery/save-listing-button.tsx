"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchCurrentUser } from "@/lib/api/auth";
import {
  listSaved,
  saveListing,
  unsaveListing,
} from "@/lib/api/applicant";
import { describeApiError, isUnauthorized } from "@/lib/api/errors";
import { primaryButton, secondaryButton } from "@/lib/ui";

export function SaveListingButton({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetchCurrentUser();
        const rows = await listSaved();
        if (!active) return;
        setSignedIn(true);
        setSaved(rows.some((row) => row.opportunity_id === opportunityId));
      } catch (caught) {
        if (!active) return;
        if (isUnauthorized(caught)) setSignedIn(false);
        else setError(describeApiError(caught));
      }
    })();
    return () => {
      active = false;
    };
  }, [opportunityId]);

  async function handleToggle() {
    setBusy(true);
    setError("");
    try {
      if (saved) {
        await unsaveListing(opportunityId);
        setSaved(false);
      } else {
        await saveListing(opportunityId);
        setSaved(true);
      }
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) {
    return (
      <Link href="/account" className={secondaryButton}>
        Sign in to save
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={saved ? secondaryButton : primaryButton}
        onClick={handleToggle}
        disabled={busy || signedIn === null}
      >
        {saved ? "Saved ✓" : "Save listing"}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
