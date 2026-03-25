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

  /* Fetch DB role whenever session changes */
  useEffect(() => {
    if (!session) {
      setUserRole(null);
      return;
    }
    fetch("/api/me")
      .then((r) => {
        if (!r.ok) throw new Error(`/api/me returned ${r.status}`);
        return r.json();
      })
      .then((d) => setUserRole(d.role ?? "CUSTOMER"))
      .catch(() => {
        // Fallback: check Supabase user_metadata for intended_role (set by callback)
        const metaRole = session.user?.user_metadata?.intended_role;
        setUserRole(metaRole === "OWNER" ? "OWNER" : "CUSTOMER");
      });
  }, [session]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    const initSession = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoaded(true);
    };
    initSession();

    // Listen for auth state changes
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
