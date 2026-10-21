"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (offline page + static asset cache). Production
 * only: in development it would serve stale files between hot reloads.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the site works the same without it, just not offline.
    });
  }, []);
  return null;
}
