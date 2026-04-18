import { AlertTriangle } from "lucide-react";

export default function NotPersistedBanner() {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">Preview only — not saved yet</p>
        <p className="mt-0.5 text-amber-800/90">
          Changes on this tab live in-memory and are lost on reload. Persistence is coming in a future update.
        </p>
      </div>
    </div>
  );
}
