import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for a detail page (listing, session, application) while its
 * data streams in. Sent as part of the instant static shell.
 */
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="grid content-start gap-5">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="aspect-[5/2] w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </section>
  );
}
