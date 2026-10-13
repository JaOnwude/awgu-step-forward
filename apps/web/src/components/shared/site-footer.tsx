import Link from "next/link";

import { footerNav } from "@/lib/navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">Awgu StepForward</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Verified opportunities for learning, work, and your next step, with
            Awgu LGA prioritised.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border px-4 py-4">
        <p className="mx-auto w-full max-w-6xl text-xs text-muted-foreground">
          Week-1 demo build. All listings and accounts are synthetic sample data.
        </p>
      </div>
    </footer>
  );
}
