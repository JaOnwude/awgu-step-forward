"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** Chrome/Edge/Android event that lets a page show its own install button. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noopSubscribe = () => () => {};

function useDeviceInfo() {
  const standalone = useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => true, // server: render nothing until we know
  );
  const ios = useSyncExternalStore(
    noopSubscribe,
    () => /iphone|ipad|ipod/i.test(navigator.userAgent),
    () => false,
  );
  return { standalone, ios };
}

/**
 * "Install the app": on Android/desktop Chrome it opens the browser's install
 * prompt; on iPhone (no prompt API) it explains Share → Add to Home Screen.
 * Hidden once the app is installed and running from the home screen.
 */
export function InstallAppButton({
  buttonClassName,
  hintClassName,
}: {
  buttonClassName?: string;
  hintClassName?: string;
}) {
  const { standalone, ios } = useDeviceInfo();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault(); // keep it for our button instead of a mini-bar
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      toast.success("StepForward is on your home screen");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2",
          buttonClassName,
        )}
      >
        <Download aria-hidden className="size-4" /> Install the app
      </button>
    );
  }

  if (ios) {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm", hintClassName)}>
        <Share aria-hidden className="size-4 shrink-0" />
        Get the app: tap Share, then “Add to Home Screen”.
      </p>
    );
  }

  return null;
}
