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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const { totalItems } = useCart();
  const { isSignedIn, isLoaded, user, userRole, signOut } = useAuth();
  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

  /* Mobile search */
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  /* Build initials from user name */
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
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        <div className="flex h-14 md:h-16 items-center justify-between gap-3">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Mountain className="h-6 w-6 md:h-7 md:w-7 text-[#E23744]" strokeWidth={2.5} />
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-[#1F2A2A]">
              Hima<span className="text-[#E23744]">Volt</span>
            </span>
          </Link>

          {/* ── Desktop Search ── */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative flex w-full items-center rounded-full bg-gray-50 border border-gray-200 focus-within:border-[#E23744]/30 focus-within:bg-white focus-within:shadow-sm transition-all">
              <Search className="absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for food, restaurants..."
                className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none rounded-full"
              />
            </div>
          </div>

          {/* ── Mobile Search Bar (expands) ── */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "100%" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 z-50 flex items-center bg-white px-3 md:hidden"
              >
                <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3.5 py-2">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search food, restaurants..."
                    className="flex-1 bg-transparent text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setSearchValue("");
                  }}
                  className="ml-2 rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Mobile: Search + Cart ── */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onCartClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#E23744] text-[9px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
          </div>

          {/* ── Desktop Actions ── */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {/* Owner: My Restaurants */}
            {isLoaded && isSignedIn && isOwnerOrAdmin && (
              <Link
                href="/manage-restaurants"
                className="flex items-center gap-2 rounded-full bg-[#1F2A2A] px-4 py-2 text-xs font-bold text-white hover:bg-[#333] transition-all"
              >
                <Store className="h-3.5 w-3.5" />
                <span>My Restaurants</span>
              </Link>
            )}

            {/* Not signed in: Staff Portal */}
            {isLoaded && !isSignedIn && (
              <Link
                href="/staff-login"
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-[#1F2A2A] hover:bg-gray-50 transition-all"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Staff Portal</span>
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative group flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-all hover:bg-gray-50 text-gray-600"
            >
              <ShoppingBag className="h-4.5 w-4.5 group-hover:text-[#E23744] transition-colors" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 left-5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#E23744] text-[9px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
              <span className="hidden lg:inline">Cart</span>
            </button>

            {/* Auth */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/dashboard"
                      className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden hover:ring-2 hover:ring-[#E23744]/20 transition-all"
                    >
                      {user?.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E23744]/10 text-xs font-bold text-[#E23744]">
                          {userInitials}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={signOut}
                      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-gray-400 hover:text-red-600 hover:bg-red-50/50 transition-all"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/sign-in"
                      className="rounded-full px-4 py-2 text-sm font-semibold text-[#1F2A2A] hover:bg-gray-50 transition-all"
                    >
                      Login
                    </Link>
                    <Link
                      href="/sign-up"
                      className="rounded-full bg-[#E23744] px-5 py-2 text-sm font-bold text-white hover:bg-[#c92e3c] active:scale-[0.97] transition-all shadow-sm shadow-[#E23744]/20"
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
  );
}
