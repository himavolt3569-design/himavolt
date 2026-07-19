"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const OAUTH_PENDING_KEY = "hh_oauth_pending";

/**
 * Safety net for OAuth (Google) landing on the wrong page.
 *
 * OAuth is supposed to return to /auth/callback, which provisions the account
 * and sends owners to /dashboard. But when Supabase's redirect-URL allowlist /
 * Site-URL handling drops the app redirect, the provider bounces the browser
 * straight to the Site URL ("/") instead — the user ends up signed in on the
 * marketing homepage and never reaches the callback (the callback itself can
 * never produce "/", so a "/" landing means it was skipped).
 *
 * The sign-in page sets a per-tab `hh_oauth_pending` marker immediately before
 * kicking off signInWithOAuth. sessionStorage survives the same-tab round-trip
 * to the provider and back, so when we come back signed in with the marker
 * still set, we forward to /dashboard (which renders the correct surface per
 * role and provisions via getOrCreateUser). The marker is single-use.
 *
 * When the callback DID run normally (landing already on /dashboard or an
 * /auth onboarding step), we just consume the marker and stay put.
 */
export default function OAuthLandingRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let pending = false;
    try {
      pending = sessionStorage.getItem(OAUTH_PENDING_KEY) === "1";
    } catch {}
    if (!pending) return;

    // Single-use: consume it whether or not we redirect below.
    try {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
    } catch {}

    // Already at the right place (callback worked) or mid-onboarding — leave it.
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/auth")) return;

    router.replace("/dashboard");
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
