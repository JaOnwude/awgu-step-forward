import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { StatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type SupportSession, sessionDeliveryLabel } from "@/lib/api/sessions";
import { formatWatDateTime } from "@/lib/format";

export function SessionCard({ session }: { session: SupportSession }) {
  return (
    <Card className="gap-4">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {session.provider ? (
            <VerificationBadge status={session.provider.verification_status} />
          ) : null}
          {session.is_full ? (
            <StatusBadge tone="warning">Full</StatusBadge>
          ) : (
            <StatusBadge tone="success">{session.seats_left} seats left</StatusBadge>
          )}
        </div>
        <h3 className="text-lg leading-snug font-medium">
          <Link
            href={`/sessions/${session.id}`}
            className="hover:underline focus-visible:underline"
          >
            {session.topic}
          </Link>
        </h3>
        {session.provider ? (
          <p className="text-sm text-muted-foreground">{session.provider.name}</p>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 shrink-0" />
          {formatWatDateTime(session.starts_at)} WAT
        </p>
        <p className="flex items-center gap-2">
          <MapPin aria-hidden className="size-4 shrink-0" />
          {sessionDeliveryLabel(session.delivery_mode)} · {session.location}
        </p>
        <p className="flex items-center gap-2">
          <Users aria-hidden className="size-4 shrink-0" />
          {session.capacity} places
        </p>
      </CardContent>
    </Card>
  );
}
