"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Crosshair,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MapPin,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import ThemeToggle from "@/components/shared/ThemeToggle";
import LocationPickerModal from "@/components/modals/LocationPickerModal";
import LiveSearch from "./LiveSearch";

/**
 * The customer-facing header: where am I, what am I looking for, what's in my
 * basket. Everything a marketplace visitor needs and nothing that only matters
 * to a restaurant owner, the partner path lives behind a single nav link.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/nearby", label: "Stores" },
  { href: "/hotels", label: "Hotels" },
  { href: "/offers", label: "Offers" },
  { href: "/orders", label: "Track Order" },
  { href: "/features", label: "Become a Partner" },
];

export default function MarketplaceHeader() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded, user, signOut } = useAuth();
  const { label, coords, locating, isPrecise, requestPrecise, setManual } =
    useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const locRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { items } = useCart();
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setLocOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--canvas)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[15px] font-black text-white">
              H
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-[16px] font-black tracking-tight text-[var(--text-1)]">
                HimaVolt
              </span>
              <span className="block text-[10px] font-medium text-[var(--text-3)]">
                Find Nearby. Order Easily.
              </span>
            </span>
          </Link>

          {/* Location. On mobile it sits under the brand as a compact chip,
              because the row has no width for a full picker next to a logo,
              a search field and a cart. */}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex min-w-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-semibold text-[var(--text-2)] lg:hidden"
          >
            <MapPin className="h-3 w-3 shrink-0 text-[var(--accent)]" />
            <span className="max-w-[110px] truncate">{label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>

          <div ref={locRef} className="relative hidden shrink-0 lg:block">
            <button
              onClick={() => setLocOpen((v) => !v)}
              className="flex max-w-[190px] items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--text-1)] transition-colors hover:bg-[var(--surface)]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <span className="truncate">{label}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-3)]" />
            </button>

            {locOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-2 shadow-xl">
                <button
                  onClick={() => {
                    requestPrecise();
                    setLocOpen(false);
                  }}
                  disabled={locating || isPrecise}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text-1)] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  ) : (
                    <Crosshair className="h-4 w-4 text-[var(--accent)]" />
                  )}
                  {isPrecise ? "Using your exact location" : "Use my current location"}
                </button>
                <button
                  onClick={() => {
                    setPickerOpen(true);
                    setLocOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text-1)] transition-colors hover:bg-[var(--surface)]"
                >
                  <MapPin className="h-4 w-4 text-[var(--text-3)]" />
                  Pick on the map
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <LiveSearch className="hidden min-w-0 flex-1 md:block" />

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ThemeToggle />

            {isLoaded && isSignedIn ? (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] font-semibold text-[var(--text-1)] transition-colors hover:bg-[var(--surface)]"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden max-w-[90px] truncate sm:inline">
                    {(user?.user_metadata?.full_name as string) ?? "Account"}
                  </span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-2 shadow-xl">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--text-1)] hover:bg-[var(--surface)]"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--text-1)] hover:bg-[var(--surface)]"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      My orders
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-500 hover:bg-[var(--surface)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold text-[var(--text-1)] transition-colors hover:bg-[var(--surface)]"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            <Link
              href="/orders"
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[var(--text-1)] px-1 text-[10px] font-black text-[var(--canvas)]">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-1)] transition-colors hover:bg-[var(--surface)] lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search. Always visible rather than hidden behind the menu,
            because searching is the single most common thing on a phone. */}
        <div className="px-4 pb-3 md:hidden">
          <LiveSearch compact placeholder="Search for restaurants, hotels..." />
        </div>

        {/* Desktop nav row */}
        <nav className="mx-auto hidden w-full max-w-7xl gap-1 px-4 pb-2 sm:px-6 lg:flex">
          {NAV_LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3 py-1.5 text-[13px] font-bold transition-colors ${
                  active
                    ? "text-[var(--accent-text)]"
                    : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile drawer. Search and location have their own permanent spots
            now, so this only carries the secondary links. */}
        {menuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--canvas)] px-4 py-3 lg:hidden">
            <button
              onClick={() => {
                setPickerOpen(true);
                setMenuOpen(false);
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-[13px] font-semibold text-[var(--text-1)]"
            >
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
              <span className="truncate">{label}</span>
              <span className="ml-auto text-[11px] text-[var(--text-3)]">Change</span>
            </button>

            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-[14px] font-bold text-[var(--text-1)] hover:bg-[var(--surface)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {pickerOpen && (
        <LocationPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialCoords={{
            lat: coords?.lat ?? 27.7172,
            lon: coords?.lon ?? 85.324,
          }}
          initialAddress=""
          initialCity="Kathmandu"
          onConfirm={(r) =>
            setManual(r.coords, r.address || r.city || "Your location")
          }
        />
      )}
    </>
  );
}
