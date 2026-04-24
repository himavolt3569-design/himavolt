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
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setUserRole(null);
      try {
        const keys = Object.keys(sessionStorage);
        for (const k of keys) {
          if (k.startsWith("hh_me_cache_")) sessionStorage.removeItem(k);
        }
      } catch {}
      return;
    }

    const CACHE_KEY = `hh_me_cache_${session.user?.id ?? "anon"}`;
    const CACHE_TTL = 5 * 60 * 1000;

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          setUserRole(cached.role ?? "CUSTOMER");
        }
      }
    } catch {}

    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`/api/me returned ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const role = d.role ?? "CUSTOMER";
        setUserRole(role);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ role, ts: Date.now() }),
          );
        } catch {}
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const metaRole = session.user?.user_metadata?.intended_role;
        setUserRole(metaRole === "OWNER" ? "OWNER" : "CUSTOMER");
      });

    return () => controller.abort();
  }, [session]);

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
