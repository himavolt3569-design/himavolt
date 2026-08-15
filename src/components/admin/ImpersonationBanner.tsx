"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

/**
 * Permanent, unmissable strip shown while a platform admin is managing a
 * business as its owner.
 *
 * This is not decoration. During a session the admin *is* the owner account to
 * every route in the app, so the one thing that must never happen is an
 * operator forgetting whose dashboard they are typing into. It also carries the
 * exit, and a live countdown to the one-hour expiry so a session ending
 * mid-edit is never a surprise.
 */

interface Session {
  active: boolean;
  restaurantName?: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
}

const IMPERSONATION_UI_COOKIE = "admin_impersonation_active";

function hasMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${IMPERSONATION_UI_COOKIE}=1`));
}

export default function ImpersonationBanner() {
  const [session, setSession] = useState<Session | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // No marker means no session — every other visitor pays nothing for this.
    if (!hasMarker()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/impersonate", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data?.active) setSession(data);
      } catch {
        /* the dashboard still works; only the banner is missing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const exit = async () => {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
    } catch {
      /* cookies are cleared server-side; fall through to the redirect anyway */
    }
    // Full reload, not a router push: every context in the tree is holding the
    // owner's data and must be torn down rather than reconciled.
    window.location.href = "/admin";
  };

  if (!session?.active) return null;

  return (
    <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500 px-4 py-2 text-amber-950">
      <div className="flex min-w-0 items-center gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p className="min-w-0 text-xs font-bold">
          Platform admin — you are managing{" "}
          <span className="font-black">{session.restaurantName}</span> as its owner
          {session.ownerName ? ` (${session.ownerName})` : ""}.
          <span className="hidden font-semibold sm:inline">
            {" "}
            Everything you do here is recorded against this business.
          </span>
        </p>
      </div>
      <button
        onClick={exit}
        disabled={exiting}
        className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-50 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {exiting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <LogOut className="h-3 w-3" />
        )}
        Exit to admin
      </button>
    </div>
  );
}
