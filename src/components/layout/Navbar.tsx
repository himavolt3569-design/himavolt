"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mountain,
  ShoppingBag,
  Store,
  KeyRound,
  Search,
  LogOut,
  X,
  User,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Link from "next/link";

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const { totalItems } = useCart();
  const { isSignedIn, isLoaded, user, userRole, signOut } = useAuth();
  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  const userInitials = (() => {
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-[var(--canvas)]/90 backdrop-blur-xl border-b border-[var(--border)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-1.5 group">
              <motion.div
                whileHover={{ rotate: -12 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Mountain className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} />
              </motion.div>
              <span className="text-base font-black tracking-tight text-[var(--text-1)]">
                Hima<span className="text-[var(--accent)]">Volt</span>
              </span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Theme toggle */}
              <ThemeToggle />

              {isLoaded && isSignedIn && isOwnerOrAdmin && (
                <Link
                  href="/manage-restaurants"
                  className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                >
                  <Store className="h-3.5 w-3.5" />
                  Restaurants
                </Link>
              )}

              {isLoaded && !isSignedIn && (
                <Link
                  href="/staff-login"
                  className="hidden md:flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                >
                  <KeyRound className="h-3 w-3" />
                  Staff
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={onCartClick}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] font-bold text-white"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Auth */}
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="relative flex items-center gap-0.5" ref={profileMenuRef}>
                      <button
                        onClick={() => setProfileMenuOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden hover:ring-2 hover:ring-[var(--accent-border)] transition-all"
                        aria-label="Account menu"
                      >
                        {user?.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent-text)]">
                            {userInitials}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={signOut}
                        className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:text-red-500 hover:bg-red-50/50 transition-colors"
                        aria-label="Sign Out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>

                      <AnimatePresence>
                        {profileMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[var(--canvas)] border border-[var(--border)] shadow-xl overflow-hidden z-70"
                          >
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                              <p className="text-xs font-bold text-[var(--text-1)] truncate">
                                {user?.user_metadata?.full_name || user?.user_metadata?.name || "Account"}
                              </p>
                              <p className="text-[10px] text-[var(--text-3)] truncate">{user?.email}</p>
                            </div>
                            <div className="py-1">
                              <Link
                                href="/profile"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                              >
                                <User className="h-3.5 w-3.5 text-[var(--text-3)]" />
                                View Profile
                              </Link>
                              <Link
                                href="/dashboard"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                              >
                                <LayoutDashboard className="h-3.5 w-3.5 text-[var(--text-3)]" />
                                Dashboard
                              </Link>
                              {isOwnerOrAdmin && (
                                <Link
                                  href="/manage-restaurants"
                                  onClick={() => setProfileMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                                >
                                  <Store className="h-3.5 w-3.5 text-[var(--text-3)]" />
                                  My Restaurants
                                </Link>
                              )}
                              <div className="border-t border-[var(--border)] mt-1 pt-1">
                                <button
                                  onClick={() => { setProfileMenuOpen(false); signOut(); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <LogOut className="h-3.5 w-3.5" />
                                  Sign Out
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 ml-1">
                      <Link
                        href="/sign-in"
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/sign-up"
                        className="rounded-xl bg-[var(--text-1)] px-4 py-1.5 text-xs font-bold text-[var(--canvas)] hover:opacity-80 active:scale-[0.97] transition-all"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setSearchValue(""); }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-xl px-4 pt-24 sm:pt-28"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center rounded-2xl bg-[var(--canvas)] border border-[var(--border)] shadow-2xl">
                <Search className="absolute left-4 h-5 w-5 text-[var(--text-3)] pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search food, restaurants, cuisines..."
                  className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none rounded-2xl"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchValue(""); }}
                  className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-[var(--text-3)] font-medium">
                Press ESC to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
