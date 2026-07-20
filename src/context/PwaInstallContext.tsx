"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface PwaInstallContextValue {
  /** True when the browser has offered a native install prompt and the app
   *  isn't already installed. Inline "Install app" buttons key off this. */
  canInstall: boolean;
  /** True once running as an installed PWA (standalone) or after install. */
  installed: boolean;
  /** Trigger the native install prompt. Returns the outcome (or "unavailable"). */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  installed: false,
  promptInstall: async () => "unavailable",
});

/**
 * Single, app-wide capture of the `beforeinstallprompt` event so multiple
 * places (the floating nudge, the landing page, the dashboard greeting) can
 * offer "Install app" without each racing to grab — and consume — the one-shot
 * deferred prompt.
 */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running standalone (installed) — never offer install.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem("pwaInstalled")) {
      setInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      try {
        localStorage.setItem("pwaInstalled", "true");
      } catch {}
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // one-shot — can't be reused
    if (outcome === "accepted") {
      setInstalled(true);
      try {
        localStorage.setItem("pwaInstalled", "true");
      } catch {}
    }
    return outcome;
  }, [deferred]);

  return (
    <PwaInstallContext.Provider
      value={{ canInstall: !!deferred && !installed, installed, promptInstall }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
