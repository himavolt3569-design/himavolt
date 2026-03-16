"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Menu as MenuIcon, Receipt, User, QrCode } from "lucide-react";
import clsx from "clsx";
import { useActiveTableSession } from "@/hooks/useActiveTableSession";

interface NavItem {
  name: string;
  href: string;
  icon: typeof Home;
  matchPath?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Menu", href: "/menu", icon: MenuIcon },
  { name: "Orders", href: "/orders", icon: Receipt },
  { name: "Account", href: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const activeSession = useActiveTableSession();

  const navItems = useMemo<NavItem[]>(() => {
    if (!activeSession) return DEFAULT_ITEMS;

    return [
      { name: "Home", href: "/", icon: Home },
      {
        name: "Menu",
        href: `/menu/${activeSession.restaurantSlug}?table=${activeSession.tableNo}`,
        icon: MenuIcon,
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
  }, [activeSession]);

  // Hide on manage-restaurants; hide on /scan only when there's no active session
  if (pathname === "/manage-restaurants") return null;
  if (pathname === "/scan" && !activeSession) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-snow-white/20 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const match = item.matchPath || item.href;
          const isActive = match === "/" ? pathname === "/" : pathname.startsWith(match);

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              <item.icon
                className={clsx(
                  "w-5 h-5 mb-1 transition-colors z-10",
                  isActive ? "text-saffron-flame" : "text-charcoal-slate/40",
                )}
              />
              <span
                className={clsx(
                  "text-[10px] font-medium transition-colors z-10",
                  isActive ? "text-saffron-flame" : "text-charcoal-slate/40",
                )}
              >
                {item.name}
              </span>

              {/* Active Indicator Background */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-x-2 inset-y-1 bg-saffron-flame/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
