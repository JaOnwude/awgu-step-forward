"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";

import { InlineError } from "@/components/shared/query-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/features/account/queries";
import { startTracking } from "@/lib/api/applications";
import { queryKeys } from "@/lib/query/keys";

/**
 * Apply on the provider's site (or in person) and, if signed in, keep a
 * private record to track. The record is only created when the applicant
 * acts (spec journey 5), and its status is always "reported by you".
 */
export function ExternalApply({
  opportunityId,
  externalUrl,
  inPerson,
}: {
  opportunityId: string;
  externalUrl: string | null;
  inPerson: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const track = useMutation({
    mutationFn: () => startTracking(opportunityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  });

  const tracked = track.data;

  return (
    <div className="grid gap-2">
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // The link opens in a new tab; tracking runs alongside it.
            if (user && !track.isSuccess) track.mutate();
          }}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Apply on provider site <ExternalLink aria-hidden />
        </a>
      ) : inPerson ? (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!user || track.isPending || track.isSuccess}
          onClick={() => track.mutate()}
        >
          <MapPin aria-hidden /> I’ll apply in person — track it
        </Button>
      ) : null}

      {tracked ? (
        <p role="status" className="text-xs text-muted-foreground">
          Added to{" "}
          <Link href={`/account/applications/${tracked.id}`} className="font-semibold text-primary">
            your applications
          </Link>
          . Update its status there as things progress.
        </p>
      ) : user ? (
        <p className="text-xs text-muted-foreground">
          {externalUrl
            ? "We’ll add it to your applications so you can track it. The provider’s site is outside StepForward."
            : "Track it in your applications and record each step yourself."}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Link href="/account" className="font-semibold text-primary">
            Sign in
          </Link>{" "}
          to keep track of this application.
        </p>
      )}
      <InlineError error={track.error} />
    </div>
  );
}
