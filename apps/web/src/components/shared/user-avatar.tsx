import type { UserPublic } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 text-sm",
  md: "size-14 text-xl",
  lg: "size-24 text-3xl",
} as const;

/** The user's profile picture, or their first initial on a sun circle. */
export function UserAvatar({
  user,
  size = "sm",
  className,
}: {
  user: Pick<UserPublic, "email" | "phone" | "avatar_url">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initial = (user.email ?? user.phone ?? "?").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-sun font-bold text-sun-foreground",
        SIZES[size],
        className,
      )}
    >
      {user.avatar_url ? (
        // A plain <img>: the picture is private and served with the session
        // cookie, which the next/image optimiser would not forward.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${env.apiBaseUrl}${user.avatar_url}`}
          alt=""
          className="size-full object-cover"
          decoding="async"
        />
      ) : (
        initial
      )}
    </span>
  );
}
