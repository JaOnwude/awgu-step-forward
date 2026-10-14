import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading opportunities…</span>
      <div aria-hidden>
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <Skeleton className="mt-8 h-40 rounded-xl" />

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
