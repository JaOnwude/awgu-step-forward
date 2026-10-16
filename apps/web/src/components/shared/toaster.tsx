"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/theme/theme-provider";

/**
 * Short confirmation messages ("You're signed in", "Signed out"). Sonner
 * announces them to screen readers through a polite live region.
 */
export function Toaster() {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="top-center"
      offset={84}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !font-sans !shadow-[var(--shadow-lift)]",
          title: "!font-semibold",
        },
      }}
    />
  );
}
