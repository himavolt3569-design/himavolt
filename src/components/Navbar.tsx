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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({
  onLoginClick,
  onRegisterClick,
}: {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl text-[#1F2A2A] border-b border-gray-200/60 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-20 items-center justify-between gap-4 lg:gap-8">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <Mountain className="h-8 w-8 text-[#FF9933]" strokeWidth={2.5} />
            <span className="hidden text-2xl font-extrabold tracking-tight sm:block">
              Himal<span className="text-[#FF9933]">Hub</span>
            </span>
          </div>

          {/* Location & Search - Desktop */}
          <div className="hidden flex-1 items-center gap-4 lg:flex lg:max-w-3xl">
            <div className="group relative flex cursor-pointer items-center gap-2 rounded-full bg-gray-100/80 px-4 py-2 hover:bg-gray-200/80 transition-colors border border-gray-200/50">
              <MapPin className="h-4 w-4 text-[#FF9933]" />
              <div className="flex items-center gap-1 group-hover:text-gray-900">
                <span className="text-sm font-semibold">Kathmandu, Nepal</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
              </div>
              <input
                type="text"
                className="w-full rounded-full bg-gray-100/80 py-3 pl-12 pr-4 text-sm text-[#1F2A2A] placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:bg-white border border-gray-200/50 transition-all font-medium"
                placeholder="Search restaurants, hotels or dishes..."
              />
            </div>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <button
              onClick={onLoginClick}
              className="group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:bg-gray-100 hover:text-[#FF9933]"
            >
              <User className="h-5 w-5 text-gray-600 group-hover:text-[#FF9933] transition-colors" />
              <span>Login</span>
            </button>
            <button
              onClick={onRegisterClick}
              className="rounded-full bg-gradient-to-r from-[#FF9933] to-[#ff8811] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF9933]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FF9933]/30 active:translate-y-0"
            >
              Register
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 hover:text-[#FF9933] md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Search - Show only when menu is closed */}
        <div className="pb-4 lg:hidden">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF9933] transition-colors" />
            </div>
            <input
              type="text"
              className="w-full rounded-full bg-gray-100 py-3 pl-12 pr-4 text-sm text-[#1F2A2A] placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:bg-white transition-all font-medium"
              placeholder="Search restaurants or hotels..."
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-white md:hidden overflow-hidden shadow-xl"
          >
            <div className="container mx-auto space-y-4 p-4">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 border border-gray-100">
                <MapPin className="h-5 w-5 text-[#FF9933]" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">
                    Current Location
                  </span>
                  <span className="font-bold text-[#1F2A2A]">
                    Kathmandu, Nepal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="rounded-xl bg-gray-100 py-3 text-center font-bold text-gray-700 transition-colors hover:bg-gray-200 hover:text-[#FF9933]"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onRegisterClick();
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#FF9933] to-[#ff8811] py-3 text-center font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  Register
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
