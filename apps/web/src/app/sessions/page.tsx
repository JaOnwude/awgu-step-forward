import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SessionCard } from "@/features/sessions/session-card";
import { fetchPublicSessions, type SessionListResponse } from "@/lib/api/sessions";

export const metadata: Metadata = {
  title: "Application support sessions — Awgu StepForward",
  description:
    "Free workshops and help desks across Enugu State to help you prepare applications, check documents and avoid scams.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Number.parseInt(rawPage ?? "1", 10) || 1;

  let data: SessionListResponse | null = null;
  try {
    data = await fetchPublicSessions(page);
  } catch {
    data = null;
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Application support sessions
        </h1>
        <p className="text-muted-foreground">
          Free workshops and help desks run by verified local organisations. Get
          help filling forms, checking documents, and spotting fee scams. Every
          session is reviewed by our team before it is listed.
        </p>
      </div>

      {data === null ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-6"
        >
          <p className="font-medium">We couldn’t load sessions right now.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The service did not respond. Please try again shortly.
          </p>
          <Link
            href="/sessions"
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Try again
          </Link>
        </div>
      ) : data.items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="font-medium">No upcoming sessions yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New sessions are added as local partners propose them. Meanwhile, browse
            the{" "}
            <Link href="/opportunities" className="font-medium text-primary">
              opportunity directory
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground" aria-live="polite">
            {data.total} upcoming {data.total === 1 ? "session" : "sessions"}, soonest
            first.
          </p>
          <ul className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((session) => (
              <li key={session.id}>
                <SessionCard session={session} />
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center gap-3">
              {page > 1 ? (
                <Link
                  href={`/sessions?page=${page - 1}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link
                  href={`/sessions?page=${page + 1}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
