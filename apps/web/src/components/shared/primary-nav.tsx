"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { isActive, mobileTabs, primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function PrimaryNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
      {primaryNav.map((item) => {
        const active = pathname !== null && isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "font-semibold text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TabBarLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
    >
      {mobileTabs.map(({ label, href, icon: Icon }) => {
        const active = pathname !== null && isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid min-h-12 justify-items-center gap-0.5 rounded-lg text-[0.7rem] font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "text-primary",
            )}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActivePrimaryNav() {
  return <PrimaryNavLinks pathname={usePathname()} />;
}

function ActiveTabBar() {
  return <TabBarLinks pathname={usePathname()} />;
}

// Reading the URL is request-time data under Cache Components, so the
// active-state versions sit in Suspense with an identical static fallback.
export function PrimaryNav() {
  return (
    <Suspense fallback={<PrimaryNavLinks pathname={null} />}>
      <ActivePrimaryNav />
    </Suspense>
  );
}

/** Bottom tab bar for phones and small tablets. */
export function MobileTabBar() {
  return (
    <Suspense fallback={<TabBarLinks pathname={null} />}>
      <ActiveTabBar />
    </Suspense>
  );
}
