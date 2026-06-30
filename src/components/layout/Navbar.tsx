"use client";

import { useState, useRef, useEffect } from "react";
import { Mountain, LogOut, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Link from "next/link";

export default function Navbar() {
  const { isSignedIn, isLoaded, user, userRole, signOut } = useAuth();

  const [scrolled, setScrolled] = useState(false);

  const scrolledRef = useRef(false);
  const navHeightRef = useRef<number | null>(null);

  // ─── High Performance Scroll Tracking & Height Sync ───
  useEffect(() => {
    let raf: number | null = null;

    const handler = () => {
      if (raf != null) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        const isPastLimit = window.scrollY > 40;
        if (scrolledRef.current !== isPastLimit) {
          scrolledRef.current = isPastLimit;
          setScrolled(isPastLimit);
        }

        const height = isPastLimit ? 56 : window.innerWidth >= 768 ? 72 : 64;
        if (navHeightRef.current !== height) {
          navHeightRef.current = height;
          document.documentElement.style.setProperty("--nav-height", `${height}px`);
        }
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    handler();

    return () => {
      if (raf != null) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  const userInitials = (() => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  // Profile image routing: Admin/Owner manage their business → /dashboard,
  // customers go to their personal profile → /profile.
  const profileHref =
    userRole === "OWNER" || userRole === "ADMIN" ? "/dashboard" : "/profile";

  return (
    <nav
      className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 font-poppins ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm"
          : "border-b border-transparent"
      }`}
    >
      <div className={`mx-auto max-w-7xl px-4 md:px-8 lg:px-12 flex items-center justify-between transition-all duration-500 ease-[0.16,1,0.3,1] ${
        scrolled ? "h-14" : "h-16 md:h-18"
      }`}>

        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            className={`h-9 w-9 rounded-xl transition-all duration-500 flex items-center justify-center shadow-lg ${scrolled ? 'bg-slate-900 text-white' : 'bg-[var(--accent)] text-white'}`}
          >
            <Mountain className="h-5 w-5" strokeWidth={2.5} />
          </motion.div>
          <span className={`text-xl font-black tracking-tighter text-slate-900 transition-all duration-300 font-serif ${scrolled ? 'hidden sm:block opacity-100' : 'block opacity-100'}`}>
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>

        {/* Actions Area */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {!scrolled && (
            <Link
              href="/staff-login"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Staff
            </Link>
          )}

          <ThemeToggle />

          {/* Auth Area */}
          {isLoaded && (
            <>
              {isSignedIn ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Profile avatar → role-based destination */}
                  <Link
                    href={profileHref}
                    title={profileHref === "/dashboard" ? "Go to dashboard" : "Go to profile"}
                    className={`flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300 ${scrolled ? 'h-9 w-9 ring-1 ring-slate-100' : 'h-10 w-10'} hover:ring-2 hover:ring-[var(--accent)]`}
                  >
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-black text-slate-900 uppercase">
                        {userInitials}
                      </span>
                    )}
                  </Link>

                  {/* Direct Sign Out — always visible, not hidden behind the avatar */}
                  <button
                    onClick={signOut}
                    title="Sign out"
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:block">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link href="/sign-in" className="hidden sm:block font-poppins text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all">
                    Log In
                  </Link>
                  <Link
                    href="/sign-up"
                    className={`group relative font-poppins flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white transition-all duration-300 overflow-hidden ${scrolled ? 'hidden' : 'block'}`}
                    style={{ background: "var(--accent)" }}
                  >
                    {/* glow ring */}
                    <span className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)] opacity-0 group-hover:opacity-60 blur-sm transition-all duration-300 pointer-events-none" />
                    <span className="relative flex items-center gap-1.5">
                      <span className="text-white/80 text-[10px]">✦</span>
                      Get Started Free
                    </span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
