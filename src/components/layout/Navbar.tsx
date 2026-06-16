"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mountain,
  ShoppingBag,
  Search,
  LogOut,
  X,
  User,
  LayoutDashboard,
  KeyRound,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Link from "next/link";

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const { totalItems } = useCart();
  const { isSignedIn, isLoaded, user, userRole, signOut } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

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
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <>
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

          {/* Mobile Scrolled Search (Middle) */}
          <AnimatePresence>
            {scrolled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute left-1/2 -translate-x-1/2 w-full max-w-[160px] sm:hidden pointer-events-none"
              >
                <button 
                  onClick={() => setSearchOpen(true)}
                  className="pointer-events-auto w-full flex items-center gap-2 bg-slate-50 border border-slate-100 h-9 px-3 rounded-full shadow-inner"
                >
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Explore</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop/Default Actions Area */}
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

            {/* Desktop Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all ${scrolled ? 'scale-90' : 'scale-100'}`}
            >
              <Search className="h-5 w-5" />
            </button>

            <ThemeToggle />

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className={`relative h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                scrolled ? "bg-slate-900 text-white shadow-lg scale-90" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9px] font-black shadow-lg"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>

            {/* Auth Area */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="relative flex items-center" ref={profileMenuRef}>
                    <button
                      onClick={() => setProfileMenuOpen((v) => !v)}
                      className={`flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300 ${scrolled ? 'h-9 w-9 ring-1 ring-slate-100' : 'h-10 w-10'} hover:ring-2 hover:ring-[var(--accent)]`}
                    >
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-black text-slate-900 uppercase">
                          {userInitials}
                        </span>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {profileMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-4 w-52 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-70 p-2"
                        >
                          <div className="px-4 py-4 border-b border-slate-50 mb-1">
                            <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tighter">
                              {user?.user_metadata?.full_name || "Profile"}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors">
                              <User className="h-4 w-4 opacity-30" /> Profile
                            </Link>
                            
                            {userRole === "OWNER" && (
                              <Link href="/manage-restaurants" className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors">
                                <Building2 className="h-4 w-4 opacity-30" /> My Restaurants
                              </Link>
                            )}

                            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors">
                              <LayoutDashboard className="h-4 w-4 opacity-30" /> {userRole === "CUSTOMER" ? "My Dashboard" : "Dashboard"}
                            </Link>

                            <button onClick={signOut} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
                              <LogOut className="h-4 w-4 opacity-30" /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 ml-1">
                    <Link href="/sign-in" className="hidden sm:block text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-2">
                      Login
                    </Link>
                    <Link href="/sign-up" className={`rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 transition-all ${scrolled ? 'hidden' : 'block'}`}>
                      Join
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Mobile Search Trigger (Not Scrolled) */}
            {!scrolled && (
              <button 
                onClick={() => setSearchOpen(true)}
                className="sm:hidden h-10 w-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Precise Search Overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-3xl flex items-start justify-center pt-24 md:pt-32 px-4"
            onClick={() => { setSearchOpen(false); setSearchValue(""); }}
          >
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center">
                <div className="absolute left-6 h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="What are you craving today?"
                  className="w-full bg-transparent py-7 pl-20 pr-16 text-lg font-bold text-slate-900 placeholder:text-slate-200 outline-none"
                />
                <button 
                  onClick={() => { setSearchOpen(false); setSearchValue(""); }} 
                  className="absolute right-4 h-10 w-10 rounded-2xl hover:bg-slate-50 flex items-center justify-center text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
