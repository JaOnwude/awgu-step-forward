"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronsLeft, Menu, PanelLeft, X } from "lucide-react";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/shared/logo";
import { useCurrentUser } from "@/features/account/queries";
import { isActive, sidebarGroups, type SidebarItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/theme/theme-toggle";

const STORAGE_KEY = "awgu-sidebar";
const CHANGE_EVENT = "awgu-sidebar-change";
const STAFF_ROLES = new Set(["admin", "super_admin"]);

// The folded state lives on <html data-sidebar> (set before first paint by
// the layout script) so CSS can size everything without waiting for React.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function readCollapsed(): boolean {
  return document.documentElement.dataset.sidebar === "collapsed";
}

function setCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return [collapsed, () => setCollapsed(!readCollapsed())];
}

function itemIsActive(
  item: SidebarItem,
  pathname: string | null,
  category: string | null,
): boolean {
  if (pathname === null) return false;
  if (item.category) return pathname === "/opportunities" && category === item.category;
  if (item.href === "/opportunities") return pathname === "/opportunities" && !category;
  return isActive(pathname, item.href);
}

function SidebarLinks({
  pathname,
  category,
  onNavigate,
  rail,
}: {
  pathname: string | null;
  category: string | null;
  onNavigate?: () => void;
  /** True on the desktop sidebar, which can fold to an icon rail. */
  rail: boolean;
}) {
  const { data: user } = useCurrentUser();
  const isStaff = Boolean(user?.roles.some((role) => STAFF_ROLES.has(role)));

  return (
    <nav aria-label="Sections" className="grid gap-5">
      {sidebarGroups.map((group) => {
        const items = group.items.filter((item) => !item.staffOnly || isStaff);
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="grid gap-1">
            <p
              className={cn(
                "px-3 pb-1 text-[0.68rem] font-bold tracking-[0.12em] text-muted-foreground uppercase",
                rail && "sidebar-collapsed:sr-only",
              )}
            >
              {group.title}
            </p>
            {rail ? (
              <hr aria-hidden className="mx-3 mb-1 hidden border-border sidebar-collapsed:block" />
            ) : null}
            <ul className="grid gap-0.5">
              {items.map((item) => {
                const active = itemIsActive(item, pathname, category);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={rail ? item.label : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-primary-muted font-semibold text-primary hover:bg-primary-muted hover:text-primary",
                        rail && "sidebar-collapsed:justify-center sidebar-collapsed:px-0",
                      )}
                    >
                      {/* Active marker, like VS Code's activity bar. */}
                      {active ? (
                        <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-primary" />
                      ) : null}
                      <Icon aria-hidden className="size-[1.15rem] shrink-0" />
                      <span className={cn("truncate", rail && "sidebar-collapsed:sr-only")}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function ActiveSidebarLinks(props: { onNavigate?: () => void; rail: boolean }) {
  const pathname = usePathname();
  const category = useSearchParams().get("category");
  return <SidebarLinks pathname={pathname} category={category} {...props} />;
}

// Reading the URL is request-time data under Cache Components, so the
// active-state links sit in Suspense with an identical static fallback.
function Links(props: { onNavigate?: () => void; rail: boolean }) {
  return (
    <Suspense fallback={<SidebarLinks pathname={null} category={null} {...props} />}>
      <ActiveSidebarLinks {...props} />
    </Suspense>
  );
}

/** Ctrl+B (⌘B on a Mac) folds the sidebar, as in VS Code. */
function useToggleShortcut(toggle: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Browser autofill fires keydown events with no `key`, so guard it.
      if (event.key?.toLowerCase() !== "b" || !(event.ctrlKey || event.metaKey)) return;
      if (event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}

/** Desktop: the left sidebar under the top bar, folding to an icon rail. */
export function AppSidebar() {
  const [collapsed, toggle] = useSidebarCollapsed();
  useToggleShortcut(toggle);

  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-[4.5rem] hidden h-[calc(100dvh-4.5rem)] w-[var(--sidebar-width)] shrink-0 flex-col border-r bg-card/60 transition-[width] duration-300 ease-out lg:flex"
    >
      <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
        <Links rail />
      </div>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[0.9rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sidebar-collapsed:justify-center sidebar-collapsed:px-0"
        >
          <ChevronsLeft
            aria-hidden
            className="size-[1.15rem] shrink-0 transition-transform duration-300 sidebar-collapsed:rotate-180"
          />
          <span className="sidebar-collapsed:sr-only">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </button>
      </div>
    </aside>
  );
}

/**
 * The button at the left of the top bar: folds the sidebar on desktop and
 * opens it as a drawer on smaller screens.
 */
export function SidebarToggle() {
  const [collapsed, toggle] = useSidebarCollapsed();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        className="hidden size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:grid"
      >
        <PanelLeft aria-hidden className="size-5" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          aria-label="Open menu"
          className="grid size-9 shrink-0 place-items-center rounded-xl border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,85vw)] flex-col border-r bg-background shadow-[var(--shadow-lift)] duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
            <div className="flex h-[4.5rem] items-center justify-between border-b px-4">
              <Logo />
              <DialogPrimitive.Close
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Every section of Awgu StepForward.
            </DialogPrimitive.Description>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <Links rail={false} onNavigate={() => setOpen(false)} />
            </div>
            {/* The top bar hides its theme switch on phones; it lives here. */}
            <div className="flex items-center justify-between border-t px-5 py-4 sm:hidden">
              <span className="text-sm font-medium text-muted-foreground">Light or dark</span>
              <ThemeToggle />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
