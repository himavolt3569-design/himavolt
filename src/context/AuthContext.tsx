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
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ROLE_CACHE_PREFIX = "hh_me_cache_";
const ROLE_CACHE_TTL = 5 * 60 * 1000;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
  }, [session, fetchRole]);

  useEffect(() => {
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
        isSignedIn: !!session,
        userRole,
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
