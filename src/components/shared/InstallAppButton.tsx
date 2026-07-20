"use client";

import { Download } from "lucide-react";
import { usePwaInstall } from "@/context/PwaInstallContext";

/**
 * Subtle inline "Install app" trigger. Renders nothing unless the browser has
 * offered a native install prompt and the app isn't already installed — so it
 * quietly disappears on iOS Safari and once installed.
 */
export default function InstallAppButton({
  tone = "subtle",
  label = "Install app",
  className = "",
}: {
  tone?: "subtle" | "light";
  label?: string;
  className?: string;
}) {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;

  const styles =
    tone === "light"
      ? // On the orange greeting gradient: solid white pill with accent text +
        // a soft ring so it clearly stands out (was translucent = invisible).
        "bg-white text-[var(--accent-text)] shadow-md ring-2 ring-white/70 hover:bg-[var(--canvas-sub)]"
      : "bg-[var(--accent-muted)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:bg-[var(--accent)] hover:text-white";

  return (
    <button
      onClick={() => promptInstall()}
      title="Install HimaVolt as an app on this device"
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors active:scale-95 ${styles} ${className}`}
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
