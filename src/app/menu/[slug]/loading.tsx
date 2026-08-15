import { Loader2 } from "lucide-react";

/**
 * Shown while the menu page's server component resolves.
 *
 * This deliberately returns markup now. It used to return `null` — "no visible
 * skeleton" — but `page.tsx` awaits two prefetches (restaurant + menu) before
 * it can render anything, and each is a round-trip to a remote database. So the
 * whole window between clicking a restaurant and the HTML arriving painted
 * literally nothing: a blank white page for the best part of two seconds, which
 * reads as a broken link rather than as loading. On a client-side navigation
 * from the browse grid, Next renders this instantly, so the tap now gets
 * immediate feedback.
 *
 * It is the same spinner `MenuPageClient` shows for its own loading state, so
 * the handover from this boundary to the hydrated page is seamless rather than
 * a second visual change.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--text-3)]">Loading menu...</p>
      </div>
    </div>
  );
}
