export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav: NavItem[] = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Support sessions", href: "/sessions" },
  { label: "For providers", href: "/providers" },
  { label: "My account", href: "/account" },
  { label: "Staff", href: "/admin" },
];

export const footerNav: NavItem[] = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Support sessions", href: "/sessions" },
  { label: "For providers", href: "/providers" },
  { label: "My account", href: "/account" },
  { label: "Staff workspace", href: "/admin" },
];
