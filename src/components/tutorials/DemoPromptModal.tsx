"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, X, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatDuration, type TutorialVideoDTO } from "@/lib/tutorials";

/**
 * The last step of onboarding: "here's how the thing works".
 *
 * Sequencing matters here, and the bar is deliberately high:
 *
 *  1. `AccountSetupModal` claims the screen while the account still has no
 *     password, so this waits for `hasPassword !== false`.
 *  2. **The operator must already have a restaurant.** Firing on the first
 *     signed-in page load put a tour of the product in front of someone who had
 *     not yet created the thing the tour is about, and stacked a second overlay
 *     onto a screen that was still mid-setup. A tour is only useful once there
 *     is something to tour.
 *
 * Shown once per account, ever. Onboarding nudges that keep reappearing stop
 * being helpful and start being noise, so "Maybe later" is permanent — the
 * "Watch video" control in the dashboard header is the durable entry point.
 */

const SEEN_KEY = "hv_demo_prompt_seen";

/* Operator surfaces and the auth flow itself: never interrupt these. */
const EXCLUDED_PREFIXES = [
  "/auth",
  "/admin",
  "/pos",
  "/kitchen",
  "/counter",
  "/staff-login",
  "/rider",
  "/demo",
];

export default function DemoPromptModal() {
  const { isLoaded, isSignedIn } = useAuth();
  const { restaurants, hasFetched } = useRestaurant();
  const pathname = usePathname();

  // Setup is "done" once a restaurant exists. `hasFetched` matters as much as
  // the count: an empty list during the initial load is indistinguishable from
  // a genuinely empty account, and prompting on that guess is the bug this
  // gate exists to prevent.
  const setupComplete = hasFetched && restaurants.length > 0;

  // No `mounted` guard needed: this component is imported with `ssr: false`,
  // so it never renders on the server and cannot cause a hydration mismatch.
  const [video, setVideo] = useState<TutorialVideoDTO | null>(null);
  const [open, setOpen] = useState(false);

  const alreadySeen = useCallback(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode with storage blocked: treat as seen so we never trap
      // someone in a prompt they cannot dismiss permanently.
      return true;
    }
  }, []);

  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  /**
   * Is a Radix dialog on screen?
   *
   * `CreateRestaurantModal` and friends are `@radix-ui/react-dialog` modals,
   * which disable pointer events on `<body>` for as long as they are open and
   * re-enable them only inside their own content. A body-portalled overlay
   * inherits that, so opening on top of one produces a prompt that is painted
   * perfectly and completely dead to clicks.
   *
   * Not opening is the right answer regardless of the pointer-events detail: a
   * dialog titled "New Restaurant" is setup still in progress, and this prompt
   * is supposed to be the beat *after* setup.
   */
  const dialogOnScreen = () =>
    typeof document !== "undefined" &&
    Boolean(document.querySelector('[role="dialog"][data-state="open"]'));

  useEffect(() => {
    if (!isLoaded || !isSignedIn || excluded || !setupComplete) return;
    if (alreadySeen()) return;

    let cancelled = false;
    let waitForClearScreen: number | undefined;

    (async () => {
      try {
        // Wait for the password step to be behind us before claiming the screen.
        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (!meRes.ok) return;
        const me = (await meRes.json()) as { hasPassword: boolean | null };
        if (me.hasPassword === false) return;

        const res = await fetch("/api/tutorials");
        if (!res.ok) return;
        const data = (await res.json()) as { featured: TutorialVideoDTO | null };
        if (cancelled || !data.featured) return;

        setVideo(data.featured);

        // Let the page settle first — an overlay that lands mid-paint reads as
        // an error dialog rather than an invitation — then keep waiting while
        // any other dialog holds the screen, however long that takes. Someone
        // halfway through creating a restaurant does not want a tour yet.
        waitForClearScreen = window.setInterval(() => {
          if (cancelled) return;
          if (dialogOnScreen()) return;
          window.clearInterval(waitForClearScreen);
          setOpen(true);
        }, 900);
      } catch {
        /* never block the app on a nudge */
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(waitForClearScreen);
    };
  }, [isLoaded, isSignedIn, excluded, setupComplete, alreadySeen]);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* nothing to do */
    }
    setOpen(false);
  };

  if (!video) return null;

  // Portalled to document.body, like every other modal in this codebase. Left
  // in the provider tree it inherits whatever stacking context an ancestor
  // happens to create, which is exactly how a fixed overlay ends up painted
  // correctly but sitting underneath something for hit-testing — visible, and
  // dead to clicks.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // `pointer-events-auto` is not redundant: a Radix dialog elsewhere in
          // the app disables them on <body>, and this is portalled there. The
          // gate above should mean the two never coexist — this makes a future
          // dialog unable to render the prompt inert even if one slips through.
          className="pointer-events-auto fixed inset-0 z-[140] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-prompt-title"
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl ring-1 ring-[var(--border)] sm:rounded-3xl"
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Poster */}
            <div className="relative aspect-video w-full overflow-hidden bg-[var(--canvas-sub)]">
              {video.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.posterUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--accent)] via-[#d67620] to-[#b25c1c]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent)] shadow-[0_10px_40px_-8px_rgba(234,169,77,0.9)]">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-25" />
                <PlayCircle className="h-8 w-8 fill-white/10 text-white" />
              </span>

              {formatDuration(video.durationSec) && (
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                  <Clock className="h-3 w-3" />
                  {formatDuration(video.durationSec)}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-6 sm:p-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[var(--accent-text)] ring-1 ring-[var(--accent-border)]">
                <Sparkles className="h-3 w-3" />
                You&apos;re all set
              </span>

              <h2
                id="demo-prompt-title"
                className="mt-3 text-xl font-black leading-tight tracking-tight text-[var(--text-1)] sm:text-2xl"
              >
                Want the two-minute tour?
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                {video.description?.trim() ||
                  "See how to add your first dish, take an order, and print the bill — using the same screens you just unlocked."}
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
                <Link
                  href={`/demo?v=${video.id}`}
                  onClick={close}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch the demo
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--canvas-sub)] px-5 py-3 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--border-soft)] active:scale-[0.98]"
                >
                  Maybe later
                </button>
              </div>

              <p className="mt-3.5 text-center text-[11px] text-[var(--text-3)]">
                You can reopen this any time from{" "}
                <span className="font-semibold text-[var(--text-2)]">
                  Watch video
                </span>{" "}
                in the dashboard header.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
