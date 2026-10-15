"use client";

import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/theme-provider";

/**
 * One button that swaps between light and dark. Until someone taps it the
 * site follows the device setting. Both icons are always rendered and the
 * `dark` class on <html> decides which one shows, so there is no flash of
 * the wrong icon before hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setMode } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Moon
        aria-hidden
        className="col-start-1 row-start-1 size-[1.1rem] transition-all duration-500 ease-out motion-reduce:transition-none dark:scale-0 dark:-rotate-90 dark:opacity-0"
      />
      <Sun
        aria-hidden
        className="col-start-1 row-start-1 size-[1.1rem] scale-0 rotate-90 text-sun opacity-0 transition-all duration-500 ease-out motion-reduce:transition-none dark:scale-100 dark:rotate-0 dark:opacity-100"
      />
    </button>
  );
}
