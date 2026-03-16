"use client";

import { useState } from "react";
import {
  Mountain,
  Menu,
  X,
  ShoppingBag,
  Store,
  KeyRound,
  Search,
  User,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { totalItems } = useCart();
  const { isSignedIn, isLoaded, user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] border-b border-gray-100/80 transition-all duration-300">
      <div className="mx-auto max-w-360 px-4 md:px-8 lg:px-12">
        <div className="flex h-16 md:h-18 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Mountain className="h-7 w-7 text-[#E23744]" strokeWidth={2.5} />
            <span className="text-xl font-extrabold tracking-tight text-[#1F2A2A]">
              Hima<span className="text-[#E23744]">Volt</span>
            </span>
          </Link>

          {/* Desktop search bar */}
          <div className="hidden md:flex flex-1 max-w-sm mx-6">
            <div className="relative flex w-full items-center rounded-xl bg-gray-50 border border-gray-200 focus-within:border-[#E23744]/30 focus-within:bg-white transition-all">
              <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for food..."
                className="w-full bg-transparent py-2.5 pl-9 pr-4 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            {isLoaded && isSignedIn && (
              <Link
                href="/manage-restaurants"
                className="flex items-center gap-2 rounded-xl bg-[#1F2A2A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#333] transition-all"
              >
                <Store className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">My Restaurants</span>
              </Link>
            )}

            {/* Staff Portal — always visible */}
            <Link
              href="/staff-login"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-[#0A4D3C] hover:bg-gray-50 transition-all"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Staff Portal</span>
            </Link>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative group flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all hover:bg-gray-50 text-[#1F2A2A]"
            >
              <ShoppingBag className="h-5 w-5 text-gray-500 group-hover:text-[#E23744] transition-colors" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-[10px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
              <span className="hidden lg:inline">Cart</span>
            </button>

            {/* Auth buttons */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/profile"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E23744]/10 hover:bg-[#E23744]/20 transition-colors"
                    >
                      {user?.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-[#E23744]" />
                      )}
                    </Link>
                    <button
                      onClick={signOut}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:bg-gray-50 text-[#1F2A2A]"
                    >
                      Login
                    </Link>
                    <Link
                      href="/sign-up"
                      className="rounded-xl bg-[#E23744] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.97] shadow-sm shadow-[#E23744]/20"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              onClick={onCartClick}
              className="relative rounded-xl bg-gray-50 p-2.5 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-[10px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
            <button
              className="rounded-xl bg-gray-50 p-2.5 text-gray-600 transition-colors hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-gray-100 bg-white md:hidden overflow-hidden"
          >
            <div className="mx-auto max-w-360 space-y-3 p-5">
              {isLoaded && isSignedIn && (
                <Link
                  href="/manage-restaurants"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#1F2A2A] py-3.5 text-center text-sm font-bold text-white hover:bg-[#333] transition-colors"
                >
                  <Store className="h-4 w-4" />
                  My Restaurants
                </Link>
              )}

              {/* Staff Portal — always visible in mobile menu too */}
              <Link
                href="/staff-login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3.5 text-center text-sm font-semibold text-gray-600 hover:text-[#0A4D3C] hover:border-[#0A4D3C]/30 transition-all"
              >
                <KeyRound className="h-4 w-4" />
                Staff Portal
              </Link>

              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="space-y-3">
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 py-3.5 text-center text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/sign-in"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="rounded-xl bg-gray-100 py-3.5 text-center font-bold text-[#1F2A2A] text-sm transition-colors hover:bg-gray-200"
                      >
                        Login
                      </Link>
                      <Link
                        href="/sign-up"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="rounded-xl bg-[#E23744] py-3.5 text-center font-bold text-white text-sm transition-all hover:bg-[#c92e3c]"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
