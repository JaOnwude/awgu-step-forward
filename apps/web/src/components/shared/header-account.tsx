"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/features/account/queries";
import { useNotifications } from "@/features/notifications/queries";
import { cn } from "@/lib/utils";

const STAFF_ROLES = new Set(["admin", "super_admin"]);

/** Bell with an unread count; opens the inbox on the account page. */
function NotificationBell() {
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  return (
    <Link
      href="/account#notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={buttonVariants({ variant: "outline", size: "icon-sm", className: "relative" })}
    >
      <Bell aria-hidden />
      {unread ? (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-highlight px-1 text-[0.65rem] font-bold text-highlight-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

/** Sign-in actions for visitors; avatar (and staff link) once signed in. */
export function HeaderAccount() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return <span aria-hidden className="size-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/account"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}
        >
          Sign in
        </Link>
        <Link href="/account" className={buttonVariants({ size: "sm" })}>
          Create account
        </Link>
      </div>
    );
  }

  const name = user.email ?? user.phone ?? "Account";
  const isStaff = user.roles.some((role) => STAFF_ROLES.has(role));

  return (
    <div className="flex items-center gap-2">
      {isStaff ? (
        <Link
          href="/admin"
          className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}
        >
          Staff
        </Link>
      ) : null}
      <NotificationBell />
      <Link
        href="/account"
        aria-label={`My account (${name})`}
        className={cn(
          "grid size-9 place-items-center rounded-full bg-sun font-bold text-sun-foreground uppercase",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {name.charAt(0)}
      </Link>
    </div>
  );
}
