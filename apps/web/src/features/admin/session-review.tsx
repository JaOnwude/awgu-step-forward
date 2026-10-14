"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { InlineError } from "@/components/shared/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ManagedSession,
  type SessionDecision,
  decideSession,
  sessionDeliveryLabel,
} from "@/lib/api/sessions";
import { formatWatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";

export function SessionReview({ sessions }: { sessions: ManagedSession[] }) {
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: SessionDecision }) =>
      decideSession(id, decision, reasons[id]?.trim() || null),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.moderationQueue }),
  });
  const busyId = decide.isPending ? decide.variables?.id : undefined;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium">Support session review queue</h2>
        <CardDescription>
          Check the organiser, venue and accessibility details before approving.
          Sessions must be free; reject any that charge a fee.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions awaiting review.</p>
        ) : (
          <ul className="grid gap-4">
            {sessions.map((session) => {
              const reasonId = `session-reason-${session.id}`;
              return (
                <li
                  key={session.id}
                  className="grid gap-3 rounded-lg border border-border bg-background p-4"
                >
                  <div>
                    <p className="font-medium">{session.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.provider?.name ?? "Unknown provider"} ·{" "}
                      {formatWatDateTime(session.starts_at)} WAT ·{" "}
                      {sessionDeliveryLabel(session.delivery_mode)} · {session.location}{" "}
                      · {session.capacity} places
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Accessibility: </span>
                    {session.accessibility_notes ?? "None given"}
                  </p>
                  <div className="grid gap-1.5">
                    <Label htmlFor={reasonId}>Reason (required to reject or suspend)</Label>
                    <Input
                      id={reasonId}
                      value={reasons[session.id] ?? ""}
                      onChange={(event) =>
                        setReasons((current) => ({
                          ...current,
                          [session.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === session.id}
                      onClick={() => decide.mutate({ id: session.id, decision: "approve" })}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busyId === session.id}
                      onClick={() => decide.mutate({ id: session.id, decision: "reject" })}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <InlineError error={decide.error} />
      </CardContent>
    </Card>
  );
}
