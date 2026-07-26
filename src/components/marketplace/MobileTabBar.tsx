"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ReceiptText, Tag, User } from "lucide-react";
import { useCart } from "@/context/CartContext";

/**
 * Bottom navigation, mobile only.
 *
 * On a phone the desktop nav row collapses into a hamburger, which buries the
 * five things a customer actually does. A fixed bottom bar keeps them one thumb
 * press away and matches what people expect from every other delivery app.
 *
 * Hidden from `lg` up, where the header nav takes over.
 */

const TABS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/nearby", label: "Eat", icon: Search },
  { href: "/orders", label: "Orders", icon: ReceiptText, badge: true },
  { href: "/offers", label: "Offers", icon: Tag },
  { href: "/profile", label: "Account", icon: User },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { items } = useCart();
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--canvas)] lg:hidden"
      // Keeps the bar clear of the iOS home indicator.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {TABS.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <span className="relative">
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                {badge && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-white">
                    {cartCount}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] font-bold transition-colors ${
                  active ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
