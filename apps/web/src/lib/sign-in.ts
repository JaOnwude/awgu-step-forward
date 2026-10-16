import type { UserPublic } from "@/lib/api/auth";

const STAFF_ROLES = new Set(["admin", "super_admin"]);

/** Link to the one sign-in page, coming back to `next` afterwards. */
export function signInHref(next?: string): string {
  return next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
}

/**
 * Only same-site paths are allowed as a return address, so a crafted link
 * can't bounce someone to another website after they sign in.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return null;
  }
  if (raw.startsWith("/sign-in")) return null;
  return raw;
}

/** Where each kind of account lands when it didn't come from a specific page. */
export function homeFor(user: UserPublic): string {
  if (user.roles.some((role) => STAFF_ROLES.has(role))) return "/admin";
  if (user.roles.includes("provider")) return "/providers";
  return "/account";
}

/** The name we greet someone by before their profile has loaded. */
export function accountLabel(user: UserPublic): string {
  return user.email ?? user.phone ?? "your account";
}
