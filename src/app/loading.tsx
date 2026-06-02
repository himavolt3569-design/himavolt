import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center opacity-0 bg-[var(--canvas)]" style={{ animation: "appleFadeIn 0.4s ease-out 0.2s forwards" }}>
      <Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" />
      <style>{`@keyframes appleFadeIn { to { opacity: 1; } }`}</style>
    </div>
  );
}
