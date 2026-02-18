/**
 * usePWAInstall Hook
 * Manages the PWA install prompt lifecycle:
 * - Captures `beforeinstallprompt` deferred event
 * - Detects standalone (already-installed) mode
 * - Provides 7-day snooze via localStorage
 */

import { useCallback, useEffect, useState } from "react";

const SNOOZE_KEY = "pwa-install-snoozed-until";
const SNOOZE_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);

  // Detect if already installed (standalone mode)
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Check snooze state
  useEffect(() => {
    const until = localStorage.getItem(SNOOZE_KEY);
    if (until && Date.now() < Number(until)) {
      setIsSnoozed(true);
    } else if (until) {
      // Snooze expired — clear it
      localStorage.removeItem(SNOOZE_KEY);
      setIsSnoozed(false);
    }
  }, []);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also listen for appinstalled
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const snooze = useCallback(() => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(until));
    setIsSnoozed(true);
  }, []);

  /** Banner should show when: prompt available, not already installed, not snoozed */
  const canShow = !!deferredPrompt && !isInstalled && !isSnoozed;

  return {
    canShow,
    isInstalled,
    isSnoozed,
    install,
    snooze,
  };
}
