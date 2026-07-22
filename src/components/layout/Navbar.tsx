"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mountain,
  LogOut,
  KeyRound,
  LayoutDashboard,
  Menu,
  X,
  Cpu,
  Building2,
  User,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Link from "next/link";
import { rememberIntendedRole } from "@/lib/intended-role";

export default function Navbar() {
  const { isSignedIn, isLoaded, user, signOut } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [profileOpen, setProfileOpen] = useState(false); // desktop avatar dropdown

  const scrolledRef = useRef(false);
  const navHeightRef = useRef<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Close the profile dropdown on outside click / Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";

  const userInitials = (() => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const navLinkCls =
    "px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-[var(--accent)] hover:bg-slate-50 transition-colors";

  return (
    <nav
      className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 font-poppins ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.15)]"
          : "border-b border-transparent"
      }`}
    >
      <div className={`mx-auto max-w-7xl px-4 md:px-8 lg:px-12 flex items-center justify-between transition-all duration-500 ease-[0.16,1,0.3,1] ${
        scrolled ? "h-14" : "h-16 md:h-18"
      }`}>

        {/* ─── Left: logo + primary nav ─── */}
        <div className="flex items-center gap-2 lg:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink group">
            <motion.div
              whileHover={{ scale: 1.08, rotate: -5 }}
              className={`h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl transition-all duration-500 flex items-center justify-center shadow-lg ${scrolled ? 'bg-slate-900 text-white' : 'bg-[var(--accent)] text-white'}`}
            >
              <Mountain className="h-5 w-5" strokeWidth={2.5} />
            </motion.div>
            <span className={`min-w-0 truncate text-lg sm:text-xl font-black tracking-tighter text-slate-900 transition-all duration-300 font-serif ${scrolled ? 'hidden sm:block' : 'block'}`}>
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 pl-1 lg:pl-2 border-l border-slate-200/70">
            <Link href="/hotels" className={navLinkCls}>Hotels</Link>
            <Link href="/hardware" className={navLinkCls}>Hardware</Link>
          </div>
        </div>

        {/* ─── Right: actions ─── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Desktop cluster */}
          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />

            {isLoaded && (
              isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    title="Go to your dashboard"
                    className={`flex items-center gap-1.5 rounded-xl font-bold text-white bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/25 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all ${scrolled ? 'px-3.5 py-2 text-[13px]' : 'px-4 py-2.5 text-sm'}`}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span>Dashboard</span>
                  </Link>

                  {/* Avatar → dropdown (Profile / Staff / Sign Out) */}
                  <div ref={profileRef} className="relative">
                    <button
                      onClick={() => setProfileOpen((v) => !v)}
                      className={`flex items-center gap-1 rounded-full pl-0.5 pr-1.5 py-0.5 transition-all ${profileOpen ? 'bg-slate-100 ring-1 ring-slate-200' : 'hover:bg-slate-50'}`}
                      aria-haspopup="menu"
                      aria-expanded={profileOpen}
                    >
                      <span className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-slate-200">
                        {user?.user_metadata?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-slate-900 text-[10px] font-black text-white uppercase">
                            {userInitials}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] p-1.5 origin-top-right"
                          role="menu"
                        >
                          <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                            {user?.email && (
                              <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
                            )}
                          </div>
                          <Link
                            href="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <User className="h-4 w-4 text-slate-400" />
                            Profile
                          </Link>
                          <Link
                            href="/staff-login"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <KeyRound className="h-4 w-4 text-slate-400" />
                            Staff Login
                          </Link>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              signOut();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                            role="menuitem"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/staff-login" className={navLinkCls}>Staff</Link>
                  <Link
                    href="/sign-in"
                    onClick={() => rememberIntendedRole("CUSTOMER")}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={() => rememberIntendedRole("CUSTOMER")}
                    className="group relative flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all duration-300 overflow-hidden whitespace-nowrap active:scale-[0.97]"
                    style={{ background: "var(--accent)" }}
                  >
                    <span className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)] opacity-0 group-hover:opacity-60 blur-sm transition-all duration-300 pointer-events-none" />
                    <span className="relative flex items-center gap-1.5">
                      <span className="text-white/80 text-[10px]">✦</span>
                      Get Started
                    </span>
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile cluster: primary CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {isLoaded && (
              isSignedIn ? (
                <Link
                  href="/dashboard"
                  title="Go to your dashboard"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold text-white bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/25 active:scale-[0.97] transition-all"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => rememberIntendedRole("CUSTOMER")}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black text-white active:scale-[0.97] transition-all whitespace-nowrap"
                  style={{ background: "var(--accent)" }}
                >
                  <span className="text-white/80 text-[10px]">✦</span>
                  Get Started
                </Link>
              )
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mobile drawer ─── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-4/5 max-w-xs bg-white shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
                <span className="text-lg font-black tracking-tighter text-slate-900 font-serif">
                  Hima<span className="text-[var(--accent)]">Volt</span>
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isSignedIn && (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <span className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-slate-200">
                      {user?.user_metadata?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-slate-900 text-xs font-black text-white uppercase">
                          {userInitials}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                      {user?.email && <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>}
                    </div>
                  </div>
                )}

                <nav className="space-y-1">
                  <Link href="/hotels" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[var(--accent)] transition-all">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    Hotels
                  </Link>
                  <Link href="/hardware" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[var(--accent)] transition-all">
                    <Cpu className="h-5 w-5 text-slate-400" />
                    Hardware
                  </Link>
                  {isSignedIn && (
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                      <User className="h-5 w-5 text-slate-400" />
                      Profile
                    </Link>
                  )}
                  <Link href="/staff-login" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[var(--accent)] transition-all">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                    Staff Login
                  </Link>
                </nav>

                <div className="my-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="text-sm font-bold text-slate-700">Theme</span>
                  <ThemeToggle />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  {isLoaded && (
                    isSignedIn ? (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                      </button>
                    ) : (
                      <Link
                        href="/sign-in"
                        onClick={() => {
                          rememberIntendedRole("CUSTOMER");
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <LogIn className="h-5 w-5 text-slate-400" />
                        Log In
                      </Link>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
