"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import {
  useCurrentUser,
  useSaveListing,
  useSavedListings,
} from "@/features/account/queries";

export function SaveListingButton({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const userQuery = useCurrentUser();
  const signedIn = Boolean(userQuery.data);
  const savedQuery = useSavedListings(signedIn);
  const toggle = useSaveListing();

  if (userQuery.isSuccess && !signedIn) {
    return (
      <Button asChild variant="outline">
        <Link href="/account">Sign in to save</Link>
      </Button>
    );
  }

  const saved = Boolean(
    savedQuery.data?.some((row) => row.opportunity_id === opportunityId),
  );
  const ready = signedIn && savedQuery.isSuccess;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={saved ? "outline" : "default"}
        aria-pressed={saved}
        onClick={() => toggle.mutate({ opportunityId, saved })}
        disabled={!ready || toggle.isPending}
      >
        {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
        {saved ? "Saved" : "Save listing"}
      </Button>
      <InlineError error={toggle.error ?? savedQuery.error} />
    </div>
  );
}
