import type { LucideIcon } from "lucide-react";
import { CalendarDays, Home, Search, User } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
}

export interface TabItem extends NavItem {
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "Support sessions", href: "/sessions" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "For providers", href: "/providers" },
];

/** Bottom tab bar on phones (one-handed use, spec mobile guidance). */
export const mobileTabs: TabItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Browse", href: "/opportunities", icon: Search },
  { label: "Sessions", href: "/sessions", icon: CalendarDays },
  { label: "Me", href: "/account", icon: User },
];

export const footerGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Opportunities", href: "/opportunities" },
      { label: "Support sessions", href: "/sessions" },
      { label: "For providers", href: "/providers" },
    ],
  },
  {
    title: "Trust",
    items: [
      { label: "How verification works", href: "/#verification" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Staff workspace", href: "/admin" },
    ],
  },
  {
    title: "Your account",
    items: [
      { label: "My account", href: "/account" },
      { label: "Saved opportunities", href: "/account" },
      { label: "Applications", href: "/account" },
    ],
  },
];

/** True when `href` is the current section (prefix match, ignoring hashes). */
export function isActive(pathname: string, href: string): boolean {
  const path = href.split("#")[0] || "/";
  if (href.includes("#")) return false;
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}
