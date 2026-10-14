import Link from "next/link";
import { ChevronRight, MapPin, Monitor, ShieldCheck, Users } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { type SupportSession, sessionDeliveryLabel } from "@/lib/api/sessions";
import { formatWatTime, watDateParts } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Calendar block: weekday, big day number and month, in WAT. */
export function DateBlock({ iso, highlight = false }: { iso: string; highlight?: boolean }) {
  const parts = watDateParts(iso);
  if (!parts) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "grid w-[4.5rem] shrink-0 justify-items-center rounded-2xl py-2.5 sm:w-24 sm:py-3",
        highlight ? "bg-brand-panel text-white" : "bg-muted",
      )}
    >
      <span className={cn("eyebrow", !highlight && "text-muted-foreground")}>{parts.weekday}</span>
      <span className="font-display text-3xl leading-none font-semibold sm:text-4xl">{parts.day}</span>
      <span className={cn("text-xs", highlight ? "text-white/80" : "text-muted-foreground")}>
        {parts.month}
      </span>
    </div>
  );
}

export function SessionCard({ session, index = 0 }: { session: SupportSession; index?: number }) {
  const remote = session.delivery_mode === "remote";
  const seatsTone = session.is_full ? "neutral" : session.seats_left <= 3 ? "warning" : "success";

  return (
    <article className="group relative flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)] sm:gap-7 sm:p-6">
      <DateBlock iso={session.starts_at} highlight={index === 0} />
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex flex-wrap gap-1.5">
          {session.provider ? (
            <StatusBadge tone="verified" icon={ShieldCheck}>
              {session.provider.name}
            </StatusBadge>
          ) : null}
          <StatusBadge tone="outline" icon={remote ? Monitor : MapPin}>
            {sessionDeliveryLabel(session.delivery_mode)}
          </StatusBadge>
          <StatusBadge tone={seatsTone} icon={Users}>
            {session.is_full
              ? "Full"
              : `${session.seats_left} ${session.seats_left === 1 ? "place" : "places"} left`}
          </StatusBadge>
        </div>
        <h3 className="font-display text-xl leading-snug font-semibold sm:text-2xl">
          <Link
            href={`/sessions/${session.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {session.topic}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatWatTime(session.starts_at)}–{formatWatTime(session.ends_at)} WAT · {session.location}
          {session.accessibility_notes ? ` · ${session.accessibility_notes}` : ""}
        </p>
      </div>
      <ChevronRight aria-hidden className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
    </article>
  );
}
