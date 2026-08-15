"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { invalidateApiCache } from "@/lib/api-client";
import { clearAllResourceSnapshots } from "@/hooks/useRestaurantResource";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userRole: string | null;
  /** True while a platform admin is managing a business as its owner. */
  isImpersonating: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ROLE_CACHE_PREFIX = "hh_me_cache_";
const ROLE_CACHE_TTL = 5 * 60 * 1000;

/**
 * Readable marker set alongside the httpOnly impersonation cookie. It carries no
 * authority — the server always re-verifies the signed cookie — it just tells
 * the client to resolve an impersonated identity instead of a Supabase one, so
 * no other visitor pays for an extra request.
 */
const IMPERSONATION_UI_COOKIE = "admin_impersonation_active";

function hasImpersonationMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${IMPERSONATION_UI_COOKIE}=1`));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Fetch the authoritative role from the server. `force` skips the
  // sessionStorage cache (used after events that can change the role, e.g.
  // creating a first restaurant upgrades CUSTOMER -> OWNER).
  const fetchRole = useCallback(
    async (force = false, signal?: AbortSignal, attempt = 0) => {
      const uid = session?.user?.id;
      if (!uid) return;
      const cacheKey = `${ROLE_CACHE_PREFIX}${uid}`;

      if (!force) {
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached.role && Date.now() - cached.ts < ROLE_CACHE_TTL) {
              setUserRole(cached.role);
              return;
            }
          }
        } catch {}
      }

      // Retry an unresolved role a couple of times before giving up. The role
      // may be momentarily unknown right after OAuth while /auth/callback is
      // still provisioning the DB record, or on a transient /api/me failure.
      const retry = () => {
        if (signal?.aborted || attempt >= 2) return;
        setTimeout(() => {
          if (!signal?.aborted) fetchRole(true, signal, attempt + 1);
        }, 1500 * (attempt + 1));
      };

      try {
        const r = await fetch("/api/me", { signal, cache: "no-store" });
        if (!r.ok) throw new Error(`/api/me returned ${r.status}`);
        const d = await r.json();
        const role: string | null = d.role ?? null;
        setUserRole(role);
        // Only cache a real role. A null/unknown role (transient server error,
        // OAuth account still being provisioned by /auth/callback, etc.) must
        // NOT be persisted — otherwise a genuine OWNER gets pinned to the
        // customer experience for the cache TTL and never sees their pages.
        if (role) {
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ role, ts: Date.now() }),
            );
          } catch {}
        } else {
          retry();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Leave the role unresolved (null) so consumers keep showing a loading
        // state rather than mislabeling the user, and retry. We deliberately do
        // NOT consult user_metadata.intended_role since that field is
        // user-writable; the server is the source of truth for role.
        setUserRole(null);
        retry();
      }
    },
    [session],
  );

  const refreshRole = useCallback(() => fetchRole(true), [fetchRole]);

  useEffect(() => {
    // An impersonated identity has no Supabase session by definition — its role
    // is resolved by the effect below, so don't clear it here.
    if (isImpersonating) return;

    if (!session) {
      setUserRole(null);
      try {
        const keys = Object.keys(sessionStorage);
        for (const k of keys) {
          if (k.startsWith(ROLE_CACHE_PREFIX)) sessionStorage.removeItem(k);
        }
      } catch {}
      return;
    }

    const controller = new AbortController();
    fetchRole(false, controller.signal);
    return () => controller.abort();
  }, [session, fetchRole, isImpersonating]);

  useEffect(() => {
    // Two mutually exclusive identity sources. A platform admin managing a
    // business has no Supabase session at all — the server resolves them as the
    // owner from the signed impersonation cookie, so `/api/me` already returns
    // the owner. Synthesise the shape the dashboard reads off `user` from that
    // rather than starting the Supabase client, which would only resolve null
    // and clobber it.
    if (hasImpersonationMarker()) {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetch("/api/me", { cache: "no-store" });
          const d = await r.json();
          if (cancelled) return;
          if (d?.role && d?.id) {
            setUser({
              id: d.id,
              email: d.email ?? undefined,
              user_metadata: {
                full_name: d.name ?? undefined,
                name: d.name ?? undefined,
                avatar_url: d.imageUrl ?? undefined,
              },
            } as unknown as User);
            setUserRole(d.role);
            setIsImpersonating(true);
          }
        } catch {
          /* fall through to a signed-out shell; the banner explains it */
        } finally {
          if (!cancelled) setIsLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const supabase = getSupabaseBrowserClient();

    const initSession = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoaded(true);
    };
    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoaded(true);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Signing out of an impersonated session means ending it and going back to
    // the admin panel — there is no Supabase session to end.
    if (hasImpersonationMarker()) {
      try {
        await fetch("/api/admin/impersonate", { method: "DELETE" });
      } catch {}
      invalidateApiCache();
      clearAllResourceSnapshots();
      window.location.href = "/admin";
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // Drop any per-user data the in-memory api cache picked up.
    invalidateApiCache();
    // Dashboard resources are snapshotted to localStorage for instant repeat
    // paints (see useRestaurantResource). Those outlive the session, so clear
    // them here — otherwise the next account to sign in on this device could
    // paint the previous account's tables/menu/stock for one frame before
    // revalidation replaced it.
    clearAllResourceSnapshots();
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoaded,
        isSignedIn: !!session || isImpersonating,
        userRole,
        isImpersonating,
        refreshRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
