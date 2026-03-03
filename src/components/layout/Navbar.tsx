"use client";

import { useState } from "react";
import { Mountain, Menu, X, ShoppingBag, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Lazily import Clerk components only when Clerk is configured
let SignedIn: React.FC<{ children: React.ReactNode }> = () => null;
let SignedOut: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);
let SignInButton: React.FC<{
  children: React.ReactNode;
  mode?: string;
  appearance?: object;
}> = ({ children }) => <>{children}</>;
let SignUpButton: React.FC<{
  children: React.ReactNode;
  mode?: string;
  appearance?: object;
}> = ({ children }) => <>{children}</>;
let UserButton: React.FC<{
  afterSignOutUrl?: string;
  appearance?: object;
}> = () => null;

if (clerkEnabled) {
  const clerk = require("@clerk/nextjs");
  SignedIn = clerk.SignedIn;
  SignedOut = clerk.SignedOut;
  SignInButton = clerk.SignInButton;
  SignUpButton = clerk.SignUpButton;
  UserButton = clerk.UserButton;
}

const clerkAppearance = {
  elements: {
    socialButtonsBlockButton:
      "border-gray-200 hover:bg-gray-50 transition-all rounded-xl",
    formButtonPrimary:
      "bg-[#E23744] hover:bg-[#c92e3c] rounded-xl font-bold shadow-lg shadow-[#E23744]/20",
    footerActionLink: "text-[#E23744] hover:text-[#c92e3c] font-bold",
    card: "shadow-2xl rounded-3xl",
    headerTitle: "text-[#1F2A2A] font-extrabold",
    headerSubtitle: "text-gray-400",
  },
};

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] border-b border-gray-100/80 transition-all duration-300">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12">
        <div className="flex h-[64px] md:h-[72px] items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Mountain className="h-7 w-7 text-[#E23744]" strokeWidth={2.5} />
            <span className="text-xl font-extrabold tracking-tight text-[#1F2A2A]">
              Himal<span className="text-[#E23744]">Hub</span>
            </span>
          </Link>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            <SignedIn>
              <Link
                href="/manage-restaurants"
                className="flex items-center gap-2 rounded-xl bg-[#1F2A2A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#333] transition-all"
              >
                <Store className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">My Restaurants</span>
              </Link>
            </SignedIn>
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
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <Link
                href="/staff-login"
                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-400 hover:text-[#0A4D3C] transition-colors"
              >
                Staff Portal
              </Link>
              <SignInButton mode="modal" appearance={clerkAppearance}>
                <button className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:bg-gray-50 text-[#1F2A2A]">
                  Login
                </button>
              </SignInButton>
              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <button className="rounded-xl bg-[#E23744] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.97] shadow-sm shadow-[#E23744]/20">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
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
            <div className="mx-auto max-w-[1440px] space-y-3 p-5">
              <SignedIn>
                <Link
                  href="/manage-restaurants"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#1F2A2A] py-3.5 text-center text-sm font-bold text-white hover:bg-[#333] transition-colors"
                >
                  <Store className="h-4 w-4" />
                  My Restaurants
                </Link>
              </SignedIn>
              <SignedOut>
                <div className="grid grid-cols-2 gap-3">
                  <SignInButton mode="modal" appearance={clerkAppearance}>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-xl bg-gray-100 py-3.5 text-center font-bold text-[#1F2A2A] text-sm transition-colors hover:bg-gray-200"
                    >
                      Login
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal" appearance={clerkAppearance}>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-xl bg-[#E23744] py-3.5 text-center font-bold text-white text-sm transition-all hover:bg-[#c92e3c]"
                    >
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
                <Link
                  href="/staff-login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-center text-xs font-semibold text-gray-400 hover:text-[#0A4D3C] py-2 transition-colors"
                >
                  Staff Portal
                </Link>
              </SignedOut>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
