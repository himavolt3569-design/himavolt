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
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
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

  // Close profile menu on outside click
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
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-[0_1px_2px_rgba(62,30,12,0.05)]"
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
                <Mountain
                  className="h-5 w-5 text-[#eaa94d]"
                  strokeWidth={2.5}
                />
              </motion.div>
              <span className="text-base font-extrabold tracking-tight text-[#3e1e0c]">
                Hima<span className="text-[#eaa94d]">Volt</span>
              </span>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-0.5">
              {/* Search icon */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#3e1e0c]/40 hover:text-[#3e1e0c] hover:bg-[#fdf9ef] transition-colors"
              >
                <Search className="h-[18px] w-[18px]" />
              </motion.button>

              {/* Owner: My Restaurants */}
              {isLoaded && isSignedIn && isOwnerOrAdmin && (
                <Link
                  href="/manage-restaurants"
                  className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#3e1e0c]/50 hover:text-[#3e1e0c] hover:bg-[#fdf9ef] transition-all"
                >
                  <Store className="h-3.5 w-3.5" />
                  Restaurants
                </Link>
              )}

              {/* Staff Portal */}
              {isLoaded && !isSignedIn && (
                <Link
                  href="/staff-login"
                  className="hidden md:flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-[#3e1e0c]/35 hover:text-[#3e1e0c]/60 transition-colors"
                >
                  <KeyRound className="h-3 w-3" />
                  Staff
                </Link>
              )}

              {/* Cart */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onCartClick}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#3e1e0c]/40 hover:text-[#3e1e0c] hover:bg-[#fdf9ef] transition-colors"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                      }}
                      className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#eaa94d] text-[8px] font-bold text-[#3e1e0c]"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Auth */}
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="relative flex items-center gap-0.5" ref={profileMenuRef}>
                      {/* Avatar button — opens dropdown on all sizes */}
                      <button
                        onClick={() => setProfileMenuOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden hover:ring-2 hover:ring-[#eaa94d]/20 transition-all"
                        aria-label="Account menu"
                      >
                        {user?.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaa94d]/10 text-[10px] font-bold text-[#b25c1c]">
                            {userInitials}
                          </span>
                        )}
                      </button>
                      {/* Desktop-only logout quick button */}
                      <button
                        onClick={signOut}
                        className="hidden md:flex h-8 w-8 items-center justify-center rounded-full text-[#3e1e0c]/25 hover:text-red-500 hover:bg-red-50/50 transition-all"
                        aria-label="Sign Out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>

                      {/* Dropdown menu (mobile + desktop) */}
                      <AnimatePresence>
                        {profileMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white shadow-xl shadow-[#3e1e0c]/8 ring-1 ring-brand-200/30 overflow-hidden z-70"
                          >
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="text-xs font-bold text-[#3e1e0c] truncate">
                                {user?.user_metadata?.full_name || user?.user_metadata?.name || "Account"}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <div className="py-1">
                              <Link
                                href="/profile"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#3e1e0c] hover:bg-[#fdf9ef] transition-colors"
                              >
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                View Profile
                              </Link>
                              <Link
                                href="/dashboard"
                                onClick={() => setProfileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#3e1e0c] hover:bg-[#fdf9ef] transition-colors"
                              >
                                <LayoutDashboard className="h-3.5 w-3.5 text-gray-400" />
                                Dashboard
                              </Link>
                              {isOwnerOrAdmin && (
                                <Link
                                  href="/manage-restaurants"
                                  onClick={() => setProfileMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[#3e1e0c] hover:bg-[#fdf9ef] transition-colors"
                                >
                                  <Store className="h-3.5 w-3.5 text-gray-400" />
                                  My Restaurants
                                </Link>
                              )}
                              <div className="border-t border-gray-100 mt-1 pt-1">
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
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#3e1e0c]/60 hover:text-[#3e1e0c] transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/sign-up"
                        className="rounded-full bg-[#3e1e0c] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#733e1b] active:scale-[0.97] transition-all"
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

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-[#3e1e0c]/10 backdrop-blur-sm"
            onClick={() => {
              setSearchOpen(false);
              setSearchValue("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-xl px-4 pt-24 sm:pt-28"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center rounded-2xl bg-white shadow-2xl shadow-[#3e1e0c]/8 ring-1 ring-[#f4d69a]/30">
                <Search className="absolute left-4 h-5 w-5 text-[#8e491e]/25 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search food, restaurants, cuisines..."
                  className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-[#3e1e0c] placeholder-[#8e491e]/25 focus:outline-none rounded-2xl"
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchValue("");
                  }}
                  className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#8e491e]/30 hover:bg-[#fdf9ef] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-[#8e491e]/30 font-medium">
                Press ESC to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
