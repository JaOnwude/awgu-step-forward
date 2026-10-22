import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSignature,
  GraduationCap,
  Hammer,
  HardHat,
  Home,
  LayoutGrid,
  Lightbulb,
  Search,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";

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

export interface SidebarItem extends TabItem {
  /** Set for a category link: active when the directory shows that category. */
  category?: string;
  /** Shown only to signed-in staff. */
  staffOnly?: boolean;
}

/**
 * The collapsible left sidebar (VS Code style). It sits under the top
 * navigation and goes one level deeper: straight into each category, and
 * into your own saved items and applications.
 */
export const sidebarGroups: { title: string; items: SidebarItem[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Home", href: "/", icon: Home },
      { label: "All opportunities", href: "/opportunities", icon: LayoutGrid },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Scholarships", href: "/opportunities?category=scholarship", icon: GraduationCap, category: "scholarship" },
      { label: "Training", href: "/opportunities?category=training", icon: Lightbulb, category: "training" },
      { label: "Apprenticeships", href: "/opportunities?category=apprenticeship", icon: Wrench, category: "apprenticeship" },
      { label: "Jobs", href: "/opportunities?category=employment", icon: Briefcase, category: "employment" },
      { label: "Local paid work", href: "/opportunities?category=local_work", icon: Hammer, category: "local_work" },
      { label: "Contract work", href: "/opportunities?category=contract", icon: FileSignature, category: "contract" },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "Support sessions", href: "/sessions", icon: CalendarDays },
      { label: "How it works", href: "/#how-it-works", icon: Search },
      { label: "Verification", href: "/#verification", icon: ShieldCheck },
    ],
  },
  {
    title: "You",
    items: [
      { label: "My account", href: "/account", icon: User },
      { label: "Saved", href: "/account#saved", icon: Bookmark },
      { label: "Applications", href: "/account#applications", icon: ClipboardList },
      { label: "Notifications", href: "/account#notifications", icon: Bell },
    ],
  },
  {
    title: "Organisations",
    items: [
      { label: "For providers", href: "/providers", icon: Building2 },
      { label: "Staff workspace", href: "/admin", icon: HardHat, staffOnly: true },
      { label: "Impact dashboard", href: "/admin/impact", icon: BarChart3, staffOnly: true },
    ],
  },
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
