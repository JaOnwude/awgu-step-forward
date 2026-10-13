"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "awgu-theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const modeListeners = new Set<() => void>();

function readStoredMode(): ThemeMode {
  try {
    return (
      (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ??
      "system"
    );
  } catch {
    return "system";
  }
}

function subscribeMode(callback: () => void): () => void {
  modeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    modeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getModeSnapshot(): ThemeMode {
  return readStoredMode();
}

function getModeServerSnapshot(): ThemeMode {
  return "system";
}

function darkQuery(): MediaQueryList {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribeMedia(callback: () => void): () => void {
  const query = darkQuery();
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMediaSnapshot(): boolean {
  return darkQuery().matches;
}

function getMediaServerSnapshot(): boolean {
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    getModeServerSnapshot,
  );
  const prefersDark = useSyncExternalStore(
    subscribeMedia,
    getMediaSnapshot,
    getMediaServerSnapshot,
  );

  const resolved: ResolvedTheme =
    mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = mode;
    root.style.colorScheme = resolved;
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable; the in-memory mode still applies.
    }
    modeListeners.forEach((listener) => listener());
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
