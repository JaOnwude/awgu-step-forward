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
    <>
    <div className="border-b bg-muted">
      <div className="mx-auto grid w-full max-w-6xl items-end gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="grid gap-3">
          <p className="eyebrow text-highlight">Free · run by local partners</p>
          <h1 className="font-display text-4xl leading-[1.08] font-semibold sm:text-5xl">
            Help with your application, <em className="font-normal">in person.</em>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Workshops and help desks for scholarship forms, CVs, interview practice and
          digital skills. Every session is reviewed by our team before it’s listed. These
          are not health services.
        </p>
      </div>
    </div>
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">

      {data === null ? (
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-muted p-6">
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
        <div className="rounded-2xl border border-dashed bg-card p-8">
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
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{data.total}</span> upcoming{" "}
            {data.total === 1 ? "session" : "sessions"} · soonest first
          </p>
          <ul className="mt-4 grid gap-4">
            {data.items.map((session, index) => (
              <li key={session.id}>
                <SessionCard session={session} index={page === 1 ? index : 1} />
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
    </>
  );
}
