export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav: NavItem[] = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Support sessions", href: "/#support-sessions" },
  { label: "For providers", href: "/providers" },
  { label: "Staff", href: "/admin" },
];

export const footerNav: NavItem[] = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Support sessions", href: "/#support-sessions" },
  { label: "For providers", href: "/providers" },
  { label: "Staff workspace", href: "/admin" },
];
