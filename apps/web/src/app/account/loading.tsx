export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-surface-muted" />
      <div className="mt-6 space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
      <span className="sr-only">Loading your account…</span>
    </section>
  );
}
