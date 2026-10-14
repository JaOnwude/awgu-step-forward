import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VerificationBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RegisterPanel } from "@/features/sessions/register-panel";
import {
  fetchPublicSession,
  sessionDeliveryLabel,
  type SupportSession,
} from "@/lib/api/sessions";
import { formatWatDateTime } from "@/lib/format";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
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
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm whitespace-pre-line">{value}</dd>
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
      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <h1 className="font-medium">We couldn’t load this session.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The service did not respond. Please try again.
          </p>
        </div>
      </section>
    );
  }

  if (!session) notFound();

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-12">
      <Link href="/sessions" className="text-sm font-medium text-primary hover:underline">
        ← All support sessions
      </Link>

      <header className="mt-6 space-y-3">
        {session.provider ? (
          <VerificationBadge status={session.provider.verification_status} />
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">{session.topic}</h1>
        <p className="text-muted-foreground">
          {session.provider?.name ?? "Unknown organiser"} ·{" "}
          {formatWatDateTime(session.starts_at)} WAT
        </p>
      </header>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">What happens at this session</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line">{session.description}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Detail label="Starts" value={`${formatWatDateTime(session.starts_at)} WAT`} />
          <Detail label="Ends" value={`${formatWatDateTime(session.ends_at)} WAT`} />
          <Detail label="Format" value={sessionDeliveryLabel(session.delivery_mode)} />
          <Detail label="Where" value={session.location} />
          <Detail
            label="Places"
            value={`${session.capacity} in total · ${session.seats_left} left`}
          />
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
            value={session.accessibility_notes ?? "No accessibility notes given — ask the organiser."}
          />
          <Detail label="Organiser contact" value={session.organizer_contact} />
        </dl>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-lg font-medium">Register</h2>
        </CardHeader>
        <CardContent>
          <RegisterPanel initial={session} />
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        Sessions are free. The organiser only sees your preferred name and whether
        you attended — never your contact details or profile. Report anyone who asks
        for payment.
      </p>
    </article>
  );
}
