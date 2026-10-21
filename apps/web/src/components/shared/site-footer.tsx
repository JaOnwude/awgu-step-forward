import { cacheLife } from "next/cache";
import Link from "next/link";

import { InstallAppButton } from "@/components/shared/install-app";
import { Logo } from "@/components/shared/logo";
import { footerGroups } from "@/lib/navigation";

/**
 * The current year. Cached for a day (Cache Components won't render a bare
 * `new Date()`), so it rolls over within a day of New Year.
 */
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  return (
    // Always ink, in both themes, matching the mockups.
    <footer className="bg-[#15201a] text-[#eef0e8] dark:border-t dark:bg-[#0a0d09]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-28 sm:px-6 lg:pb-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="grid content-start gap-4">
            {/* Light laterite so "AWGU" keeps 4.5:1 contrast on the ink footer. */}
            <Logo className="[&_.font-display]:text-[#eef0e8] [&_.text-highlight]:text-[#e88a55]" />
            <p className="max-w-xs text-sm text-[#eef0e8]/70">
              Verified opportunities for learning, work, and your next step. Enugu
              State, Awgu first.
            </p>
            <InstallAppButton
              buttonClassName="bg-[#f2b33d] text-[#2a1d02] hover:bg-[#f2b33d]/90 focus-visible:ring-[#4fc79c]"
              hintClassName="text-[#eef0e8]/75"
            />
          </div>
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="grid content-start gap-2.5">
              <p className="eyebrow text-[#eef0e8]/55">{group.title}</p>
              {group.items.map((item) => (
                <Link
                  key={`${group.title}-${item.label}`}
                  href={item.href}
                  className="w-fit rounded text-sm text-[#eef0e8]/75 hover:text-[#eef0e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc79c]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-[#eef0e8]/60">
          <p>
            &copy; <CurrentYear /> Awgu StepForward. All rights reserved.
          </p>
          <p>Made in Awgu, Enugu State, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
