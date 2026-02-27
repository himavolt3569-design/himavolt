"use client";

import { useState } from "react";
import {
  Mountain,
  MapPin,
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";

export default function Navbar({
  onLoginClick,
  onRegisterClick,
  onCartClick,
}: {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onCartClick: () => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] transition-all duration-300">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <div className="flex h-[72px] md:h-[80px] items-center justify-between gap-4 lg:gap-8">
          <div className="flex shrink-0 items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95">
            <Mountain className="h-7 w-7 text-[#FF9933]" strokeWidth={2.5} />
            <span className="hidden text-xl font-extrabold tracking-tight sm:block text-[#1F2A2A]">
              Himal<span className="text-[#FF9933]">Hub</span>
            </span>
          </div>

          <div className="hidden flex-1 items-center gap-4 lg:flex lg:max-w-3xl">
            <div className="group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
              <MapPin className="h-[18px] w-[18px] text-[#FF9933] shrink-0" />
              <div className="flex items-center gap-1">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#1F2A2A] leading-tight">
                    Kathmandu
                  </span>
                  <span className="text-[11px] text-gray-400 leading-tight">
                    Nepal
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 ml-1" />
              </div>
            </div>

            <div className="h-6 w-px bg-gray-200 shrink-0" />

            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
              </div>
              <input
                type="text"
                className="w-full rounded-lg bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:bg-white border border-transparent focus:border-[#FF9933]/20 transition-all font-medium"
                placeholder="Search for restaurant or dish..."
              />
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              onClick={onCartClick}
              className="relative group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-all hover:bg-gray-50 text-[#1F2A2A]"
            >
              <ShoppingBag className="h-[20px] w-[20px] text-gray-500 group-hover:text-[#FF9933] transition-colors" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF9933] text-[10px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
              <span className="hidden lg:inline">Cart</span>
            </button>
            <button
              onClick={onLoginClick}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all hover:bg-gray-50 text-[#1F2A2A]"
            >
              <User className="h-[18px] w-[18px] text-gray-500 group-hover:text-[#FF9933] transition-colors" />
              <span>Login</span>
            </button>
            <button
              onClick={onRegisterClick}
              className="rounded-lg bg-[#0A4D3C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#083a2d] active:scale-[0.97]"
            >
              Sign Up
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onCartClick}
              className="relative rounded-lg bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF9933] text-[10px] font-bold text-white shadow-sm"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
            <button
              className="rounded-lg bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100"
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

        <div className="pb-3 lg:hidden">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
            </div>
            <input
              type="text"
              className="w-full rounded-lg bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:bg-white transition-all font-medium"
              placeholder="Search for restaurant or dish..."
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-gray-100 bg-white md:hidden overflow-hidden"
          >
            <div className="mx-auto max-w-[1440px] space-y-3 p-4">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3.5 transition-colors hover:bg-gray-100">
                <MapPin className="h-5 w-5 text-[#FF9933] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-500 font-medium leading-tight">
                    Delivering to
                  </span>
                  <span className="text-sm font-bold text-[#1F2A2A] leading-tight">
                    Kathmandu, Nepal
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="rounded-lg bg-gray-100 py-3 text-center font-bold text-[#1F2A2A] text-sm transition-colors hover:bg-gray-200"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onRegisterClick();
                  }}
                  className="rounded-lg bg-[#0A4D3C] py-3 text-center font-bold text-white text-sm transition-all hover:bg-[#083a2d]"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
