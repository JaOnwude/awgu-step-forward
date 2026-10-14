import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock, MapPin, Monitor, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { ReportDialog } from "@/features/reports/report-dialog";
import { RegisterPanel } from "@/features/sessions/register-panel";
import { DateBlock } from "@/features/sessions/session-card";
import {
  fetchPublicSession,
  sessionDeliveryLabel,
  type SupportSession,
} from "@/lib/api/sessions";
import { formatWatDateTime, formatWatTime } from "@/lib/format";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  try {
    const session = await fetchPublicSession(id);
    if (session) return { title: `${session.topic} — Awgu StepForward` };
  } catch {
    // Fall through to the generic title.
  }
  return { title: "Support session — Awgu StepForward" };
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 border-b border-dashed py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{value}</dd>
    </div>
  );
}

export default async function SessionPage({ params }: { params: Params }) {
  const { id } = await params;

  let session: SupportSession | null = null;
  let failed = false;
  try {
    session = await fetchPublicSession(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-muted p-6">
          <h1 className="font-semibold">We couldn’t load this session.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The service did not respond. Please try again.
          </p>
          <Link href="/sessions" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            All sessions
          </Link>
        </div>
      </section>
    );
  }

  if (!session) notFound();

  const remote = session.delivery_mode === "remote";

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft aria-hidden className="size-4" /> All support sessions
      </Link>

      <div className="mt-5 grid items-start gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="grid gap-8">
          <header className="flex items-start gap-5">
            <DateBlock iso={session.starts_at} highlight />
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-1.5">
                {session.provider ? (
                  <StatusBadge tone="verified" icon={ShieldCheck}>
                    {session.provider.name}
                  </StatusBadge>
                ) : null}
                <StatusBadge tone="outline" icon={remote ? Monitor : MapPin}>
                  {sessionDeliveryLabel(session.delivery_mode)}
                </StatusBadge>
              </div>
              <h1 className="font-display text-3xl leading-[1.1] font-semibold sm:text-5xl">
                {session.topic}
              </h1>
              <p className="text-muted-foreground">
                {formatWatTime(session.starts_at)}–{formatWatTime(session.ends_at)} WAT ·{" "}
                {session.location}
              </p>
            </div>
          </header>

          <section className="grid gap-3">
            <h2 className="font-display text-3xl font-semibold">What happens at this session</h2>
            <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
              {session.description}
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-xl font-bold">Details</h2>
            <dl className="rounded-2xl border bg-card px-5">
              <Detail label="Starts" value={`${formatWatDateTime(session.starts_at)} WAT`} />
              <Detail label="Ends" value={`${formatWatDateTime(session.ends_at)} WAT`} />
              <Detail label="Where" value={session.location} />
              <Detail
                label="Who can attend"
                value={
                  session.age_suitability === "adults"
                    ? "Adults (18+)"
                    : "All ages (adults only during the pilot)"
                }
              />
              <Detail
                label="Accessibility"
                value={session.accessibility_notes ?? "No notes given — ask the organiser."}
              />
              <Detail label="Organiser contact" value={session.organizer_contact} />
            </dl>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="grid gap-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <p className="eyebrow text-muted-foreground">Register · free</p>
            <RegisterPanel initial={session} />
          </div>
          <p className="flex gap-2 px-1 text-xs text-muted-foreground">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            The organiser only sees your preferred name and whether you attended — never
            your contact details or profile. Report anyone who asks for payment.
          </p>
          <div className="px-1">
            <ReportDialog targetType="support_session" targetId={session.id} targetLabel="session" />
          </div>
        </aside>
      </div>
    </article>
  );
}
