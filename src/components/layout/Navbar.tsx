"use client";

import { useState, useRef, useEffect } from "react";
import { Mountain, LogOut, KeyRound, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Link from "next/link";
import { rememberIntendedRole } from "@/lib/intended-role";

export default function Navbar() {
  const { isSignedIn, isLoaded, user, signOut } = useAuth();

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
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            className={`h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl transition-all duration-500 flex items-center justify-center shadow-lg ${scrolled ? 'bg-slate-900 text-white' : 'bg-[var(--accent)] text-white'}`}
          >
            <Mountain className="h-5 w-5" strokeWidth={2.5} />
          </motion.div>
          <span className={`min-w-0 truncate text-lg sm:text-xl font-black tracking-tighter text-slate-900 transition-all duration-300 font-serif ${scrolled ? 'hidden sm:block opacity-100' : 'block opacity-100'}`}>
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>

        {/* Actions Area */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          <Link
            href="/hotels"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-[13px] sm:text-sm font-bold text-slate-700 hover:text-[var(--accent)] hover:bg-slate-50 transition-all"
          >
            Hotels
          </Link>

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
                  {/* Dashboard — an explicit entry point for tablet/desktop,
                      where there's no bottom nav. Hidden below `md` on purpose:
                      on phones the bottom nav already has Home/Dashboard/Orders/
                      Account, so a second Dashboard button here only crowds the
                      bar. /dashboard resolves to the owner console or the
                      customer dashboard per role. */}
                  <Link
                    href="/dashboard"
                    title="Go to your dashboard"
                    className={`hidden md:flex items-center gap-1.5 rounded-xl font-bold text-white bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/25 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all ${scrolled ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm'}`}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span>Dashboard</span>
                  </Link>

                  {/* Profile avatar → personal account page */}
                  <Link
                    href="/profile"
                    title="Your profile"
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
                  <Link
                    href="/sign-in"
                    onClick={() => rememberIntendedRole("CUSTOMER")}
                    className="hidden sm:block font-poppins text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={() => rememberIntendedRole("CUSTOMER")}
                    className={`group relative font-poppins flex items-center gap-1.5 rounded-xl px-3.5 sm:px-5 py-2 text-xs font-black text-white transition-all duration-300 overflow-hidden whitespace-nowrap ${scrolled ? 'hidden' : 'block'}`}
                    style={{ background: "var(--accent)" }}
                  >
                    {/* glow ring */}
                    <span className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)] opacity-0 group-hover:opacity-60 blur-sm transition-all duration-300 pointer-events-none" />
                    <span className="relative flex items-center gap-1.5">
                      <span className="hidden sm:inline text-white/80 text-[10px]">✦</span>
                      Get Started<span className="hidden sm:inline">&nbsp;Free</span>
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
