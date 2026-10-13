export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12" aria-busy="true">
      <div className="max-w-2xl space-y-3">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-muted" />
      </div>

      <div className="mt-8 h-40 animate-pulse rounded-2xl border border-border bg-surface" />

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="h-5 w-32 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading opportunities…</span>
    </section>
  );
}
