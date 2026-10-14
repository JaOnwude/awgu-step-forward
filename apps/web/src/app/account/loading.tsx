import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section
      className="mx-auto w-full max-w-4xl px-4 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading your account…</span>
      <div aria-hidden>
        <Skeleton className="h-6 w-40" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </section>
  );
}
