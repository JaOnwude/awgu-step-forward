import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { footerGroups } from "@/lib/navigation";

export function SiteFooter() {
  return (
    // Always ink, in both themes, matching the mockups.
    <footer className="bg-[#15201a] text-[#eef0e8] dark:border-t dark:bg-[#0a0d09]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-28 sm:px-6 lg:pb-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="grid content-start gap-4">
            <Logo className="[&_.font-display]:text-[#eef0e8]" />
            <p className="max-w-xs text-sm text-[#eef0e8]/70">
              Verified opportunities for learning, work, and your next step. Enugu
              State, Awgu first.
            </p>
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
        <div className="mt-10 border-t border-white/15 pt-5 text-xs text-[#eef0e8]/60">
          Demo build · all listings, names and accounts are sample data. Verification
          means our team reviewed a provider — it is not a government endorsement.
        </div>
      </div>
    </footer>
  );
}
