"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Receipt,
  User,
  QrCode,
  KeyRound,
  UserPlus,
  UtensilsCrossed,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import clsx from "clsx";
import { useActiveTableSession } from "@/hooks/useActiveTableSession";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  name: string;
  href: string;
  icon: typeof Home;
  matchPath?: string;
  avatar?: string | null;
  initials?: string;
}

export default function BottomNav() {
  const pathname = usePathname();
  const activeSession = useActiveTableSession();
  const { isSignedIn, isLoaded, user, userRole } = useAuth();

  const userInitials = useMemo(() => {
    if (!user) return "";
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  const avatarUrl = user?.user_metadata?.avatar_url || null;

  const navItems = useMemo<NavItem[]>(() => {
    if (activeSession) {
      return [
        { name: "Home", href: "/", icon: Home },
        {
          name: "Menu",
          href: `/menu/${activeSession.restaurantSlug}?table=${activeSession.tableNo}`,
          icon: UtensilsCrossed,
          matchPath: `/menu/${activeSession.restaurantSlug}`,
        },
        { name: "Orders", href: "/orders", icon: Receipt },
        {
          name: "Scan",
          href: `/scan?restaurant=${activeSession.restaurantSlug}`,
          icon: QrCode,
          matchPath: "/scan",
        },
      ];
    }

    if (isSignedIn && userRole === "ADMIN") {
      return [
        { name: "Home", href: "/", icon: Home },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, matchPath: "/dashboard" },
        { name: "Admin", href: "/admin", icon: Shield, matchPath: "/admin" },
        {
          name: "Account",
          href: "/profile",
          icon: User,
          matchPath: "/profile",
          avatar: avatarUrl,
          initials: userInitials,
        },
      ];
    }

    if (isSignedIn && userRole === "OWNER") {
      return [
        { name: "Home", href: "/", icon: Home },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, matchPath: "/dashboard" },
        { name: "Orders", href: "/orders", icon: Receipt },
        {
          name: "Account",
          href: "/profile",
          icon: User,
          matchPath: "/profile",
          avatar: avatarUrl,
          initials: userInitials,
        },
      ];
    }

    if (isSignedIn) {
      return [
        { name: "Home", href: "/", icon: Home },
        { name: "Explore", href: "/menu", icon: Search },
        { name: "Orders", href: "/orders", icon: Receipt },
        {
          name: "Account",
          href: "/profile",
          icon: User,
          matchPath: "/profile",
          avatar: avatarUrl,
          initials: userInitials,
        },
      ];
    }

    return [
      { name: "Home", href: "/", icon: Home },
      { name: "Explore", href: "/menu", icon: Search },
      { name: "Staff", href: "/staff-login", icon: KeyRound },
      { name: "Sign In", href: "/sign-in", icon: UserPlus },
    ];
  }, [activeSession, isSignedIn, avatarUrl, userInitials, userRole]);

  if (pathname === "/scan" && !activeSession) return null;
  if (pathname === "/kitchen" || pathname === "/counter") return null;
  if (pathname === "/dashboard") return null;
  if (pathname === "/admin") return null;
  if (pathname === "/staff-login") return null;
  if (!isLoaded) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--canvas)]/95 backdrop-blur-xl border-t border-[var(--border)] pb-safe">
      <div className="flex justify-around items-center h-[56px] px-1">
        {navItems.map((item) => {
          const match = item.matchPath || item.href;
          const isActive =
            match === "/" ? pathname === "/" : pathname.startsWith(match);

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute inset-x-2 top-1 bottom-1 bg-[var(--accent-muted)] rounded-xl"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}

              {item.avatar || item.initials ? (
                <div className="relative z-10 mb-0.5">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt=""
                      className={clsx(
                        "h-5 w-5 rounded-full object-cover transition-all",
                        isActive
                          ? "ring-[1.5px] ring-[var(--accent)] ring-offset-1"
                          : "opacity-60 group-hover:opacity-90"
                      )}
                    />
                  ) : (
                    <span
                      className={clsx(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold transition-colors",
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface)] text-[var(--text-2)]"
                      )}
                    >
                      {item.initials}
                    </span>
                  )}
                </div>
              ) : (
                <item.icon
                  className={clsx(
                    "h-5 w-5 mb-0.5 transition-colors z-10",
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              )}

              <span
                className={clsx(
                  "text-[10px] font-semibold transition-colors z-10 leading-none",
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
