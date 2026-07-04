"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mountain, Search, User, Globe, Menu } from "lucide-react";
import { Button } from "@/components/design-system/primitives/Button";

// A premium, Airbnb/Apple style transparent-to-solid navbar
function HotelNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  
  // Only transparent on the absolute root of the stays hub
  const isHome = pathname === "/hotels";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shouldBeSolid = !isHome || isScrolled;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        shouldBeSolid
          ? "bg-[var(--surface)] border-[var(--border)] shadow-sm py-4"
          : "bg-transparent border-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link 
          href="/hotels"
          className={cn(
            "flex items-center gap-2 transition-colors group",
            shouldBeSolid ? "text-[var(--accent)]" : "text-white"
          )}
        >
          <div className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-105 group-hover:-rotate-3",
            shouldBeSolid ? "bg-[var(--accent)] text-white" : "bg-white/20 text-white backdrop-blur-md"
          )}>
            <Mountain className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-fraunces text-2xl font-bold tracking-tight hidden sm:block">
            HimaVolt <span className="text-sm font-sans font-medium tracking-normal opacity-80">Stays</span>
          </span>
        </Link>

        {/* Desktop Search Pill */}
        <Link 
          href="/hotels"
          className={cn(
            "hidden md:flex items-center rounded-full border shadow-sm transition-all duration-300 overflow-hidden hover:shadow-md cursor-pointer",
            shouldBeSolid ? "opacity-100 translate-y-0 border-[var(--border)] bg-[var(--surface)]" : "opacity-0 -translate-y-4 pointer-events-none bg-white/10 backdrop-blur-md border-white/20 text-white"
          )}
        >
          <div className={cn("px-4 py-2.5 text-sm font-semibold border-r", shouldBeSolid ? "border-[var(--border)] text-[var(--text-1)]" : "border-white/20")}>
            Anywhere
          </div>
          <div className={cn("px-4 py-2.5 text-sm font-semibold border-r", shouldBeSolid ? "border-[var(--border)] text-[var(--text-1)]" : "border-white/20")}>
            Any dates
          </div>
          <div className={cn("px-4 py-2.5 text-sm flex items-center gap-3", shouldBeSolid ? "text-[var(--text-3)]" : "text-white/80")}>
            Add guests
            <div className="bg-[var(--accent)] rounded-full p-1.5 text-white">
              <Search className="h-4 w-4" />
            </div>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Link 
            href="/"
            className={cn(
              "hidden sm:flex rounded-full font-semibold px-4 py-2 text-sm transition-colors",
              shouldBeSolid ? "text-[var(--text-2)] hover:bg-[var(--surface-alt)]" : "text-white hover:bg-white/10"
            )}
          >
            Food Delivery
          </Link>
          <Link 
            href="/profile"
            className={cn(
              "flex items-center gap-2 rounded-full border p-1 pl-3 transition-colors cursor-pointer hover:shadow-md",
              shouldBeSolid ? "border-[var(--border)] bg-[var(--surface)]" : "border-white/20 bg-white/10 backdrop-blur-md text-white"
            )}
          >
            <Menu className="h-5 w-5" />
            <div className="bg-[var(--text-2)] text-white rounded-full p-1.5">
              <User className="h-5 w-5" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function StaysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col font-sans" data-theme="hotel">
      <HotelNavbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
