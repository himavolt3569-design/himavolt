"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mountain, Search, User, UtensilsCrossed, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// A premium, Airbnb/Apple style transparent-to-solid navbar for the Stays hub.
function HotelNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded, user, userRole, signOut } = useAuth();

  // Only transparent on the absolute root of the stays hub
  const isHome = pathname === "/hotels";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the account menu on outside click / route change.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const shouldBeSolid = !isHome || isScrolled;

  const isBusiness = userRole === "OWNER" || userRole === "ADMIN";
  const profileHref = isBusiness ? "/dashboard" : "/profile";

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "";
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const initials = (() => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1])
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase() || "HV";
  })();

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/hotels");
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        shouldBeSolid
          ? "bg-[var(--surface)] border-[var(--border)] shadow-sm py-3.5"
          : "bg-transparent border-transparent py-5",
      )}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/hotels"
          className={cn(
            "flex items-center gap-2 transition-colors group shrink-0",
            shouldBeSolid ? "text-[var(--accent)]" : "text-white",
          )}
        >
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-105 group-hover:-rotate-3",
              shouldBeSolid
                ? "bg-[var(--accent)] text-white"
                : "bg-white/20 text-white backdrop-blur-md",
            )}
          >
            <Mountain className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-fraunces text-2xl font-bold tracking-tight hidden sm:block">
            HimaVolt{" "}
            <span className="text-sm font-sans font-medium tracking-normal opacity-80">
              Stays
            </span>
          </span>
        </Link>


        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className={cn(
              "hidden sm:flex items-center gap-1.5 rounded-full font-semibold px-4 py-2 text-sm transition-colors",
              shouldBeSolid
                ? "text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                : "text-white hover:bg-white/10",
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Food Delivery
          </Link>

          {/* Account */}
          {isLoaded && !isSignedIn ? (
            <Link
              href="/sign-in"
              className={cn(
                "rounded-full font-semibold px-5 py-2 text-sm transition-all active:scale-95",
                shouldBeSolid
                  ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  : "bg-white text-[var(--text-1)] hover:bg-white/90",
              )}
            >
              Log in
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2 rounded-full border p-1 pl-3 transition-all cursor-pointer hover:shadow-md active:scale-95",
                  shouldBeSolid
                    ? "border-[var(--border)] bg-[var(--surface)] text-[var(--text-1)]"
                    : "border-white/20 bg-white/10 backdrop-blur-md text-white",
                )}
                aria-label="Account menu"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    menuOpen && "rotate-180",
                  )}
                />
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="bg-[var(--accent)] text-white rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold">
                    {isSignedIn ? initials : <User className="h-4 w-4" />}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-float overflow-hidden py-1.5 animate-[fadeIn_0.12s_ease-out]">
                  {isSignedIn && displayName && (
                    <div className="px-4 py-2.5 border-b border-[var(--border-soft)]">
                      <p className="text-sm font-bold text-[var(--text-1)] truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-[var(--text-3)] truncate">
                        {user?.email}
                      </p>
                    </div>
                  )}
                  <Link
                    href={profileHref}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] hover:bg-[var(--surface-alt)] transition-colors"
                  >
                    {isBusiness ? (
                      <LayoutDashboard className="h-4 w-4 text-[var(--text-3)]" />
                    ) : (
                      <User className="h-4 w-4 text-[var(--text-3)]" />
                    )}
                    {isBusiness ? "Dashboard" : "My profile"}
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-1)] hover:bg-[var(--surface-alt)] transition-colors"
                  >
                    <UtensilsCrossed className="h-4 w-4 text-[var(--text-3)]" />
                    Food Delivery
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--state-error)] hover:bg-[var(--surface-alt)] transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function StaysLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The /hotels hero is intentionally full-bleed under the transparent navbar.
  // Every other stays page needs to clear the fixed (solid) navbar.
  const isHome = pathname === "/hotels";

  return (
    <div
      className="min-h-screen bg-[var(--canvas)] flex flex-col font-sans"
      data-theme="hotel"
    >
      <HotelNavbar />
      <main className={cn("flex-1 flex flex-col", !isHome && "pt-[68px]")}>
        {children}
      </main>
    </div>
  );
}
