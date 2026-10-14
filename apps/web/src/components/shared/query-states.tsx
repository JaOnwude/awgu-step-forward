import type { ReactNode } from "react";
import { AlertCircle, LockKeyhole, WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiErrorInfo } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

/**
 * Content-shaped list placeholder (spec R49–R51). Announces one loading
 * status and hides the decorative shapes from screen readers.
 */
export function ListSkeleton({
  rows = 3,
  label = "Loading…",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("grid gap-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
        >
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Block placeholder for a form or detail section. */
export function SectionSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden className="h-6 w-1/3" />
      <Skeleton aria-hidden className="h-4 w-2/3" />
      <Skeleton aria-hidden className="h-24 w-full" />
    </div>
  );
}

/**
 * Error state with distinct offline / permission / generic messages and a
 * retry action (spec R50). Never leaves an indefinite skeleton.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  children,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  children?: ReactNode;
}) {
  const info = toApiErrorInfo(error);
  const offline = info.status === 0 && info.code === "network_error";
  const denied = info.status === 401 || info.status === 403;
  const Icon = offline ? WifiOff : denied ? LockKeyhole : AlertCircle;
  const heading =
    title ??
    (offline
      ? "You appear to be offline"
      : denied
        ? "You don’t have access to this"
        : "Something went wrong");

  return (
    <Alert variant={denied || offline ? "default" : "destructive"}>
      <Icon aria-hidden />
      <AlertTitle>{heading}</AlertTitle>
      <AlertDescription>
        <p>{info.message}</p>
        {children}
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/** Inline mutation error under a form or action. */
export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {toApiErrorInfo(error).message}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-xs text-destructive">{message}</span>;
}
