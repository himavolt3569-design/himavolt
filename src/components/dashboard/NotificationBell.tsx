"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CircleDollarSign,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  Inbox,
} from "lucide-react";
import { useLiveOrders, type LiveOrder } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";

interface Notification {
  id: string;
  orderId: string;
  orderNo: string;
  title: string;
  detail: string;
  total: number;
  createdAt: number;
  kind: "PENDING" | "ACCEPTED" | "REJECTED";
}

function orderToNotification(o: LiveOrder): Notification {
  const ref = o.status === "PENDING" ? o.createdAt : o.createdAt;
  const tableLabel = o.tableNo ? ` · Table ${o.tableNo}` : "";
  const detail =
    o.type === "DINE_IN"
      ? `Dine-in${tableLabel}`
      : o.type === "TAKEAWAY"
        ? "Takeaway"
        : "Delivery";

  const titles: Record<LiveOrder["status"], string> = {
    PENDING: "New order received",
    ACCEPTED: "Order accepted",
    REJECTED: "Order rejected",
  };

  return {
    id: `${o.id}:${o.status}`,
    orderId: o.id,
    orderNo: o.orderNo,
    title: titles[o.status] ?? "Order updated",
    detail,
    total: o.total,
    createdAt: new Date(ref).getTime(),
    kind: o.status as Notification["kind"],
  };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "1 min ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const KIND_STYLE: Record<Notification["kind"], { bg: string; fg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { bg: "bg-[var(--accent-muted)]", fg: "text-[var(--accent-text)]", Icon: CircleDollarSign },
  ACCEPTED: { bg: "bg-blue-500/15", fg: "text-blue-600", Icon: CheckCircle2 },
  REJECTED: { bg: "bg-red-500/15", fg: "text-red-600", Icon: XCircle },
};

const STORAGE_KEY = "dashboard:notifications:lastSeen";

interface Props {
  onNavigateToOrders?: () => void;
}

export default function NotificationBell({ onNavigateToOrders }: Props) {
  const { orders } = useLiveOrders();
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";

  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const notifications = useMemo<Notification[]>(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return orders
      .map(orderToNotification)
      .filter((n) => n.createdAt >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  }, [orders]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.createdAt > lastSeen && n.kind !== "REJECTED",
      ).length,
    [notifications, lastSeen],
  );

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setLastSeen(now);
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        /* ignore */
      }
    }
  }

  function handleItemClick() {
    setOpen(false);
    onNavigateToOrders?.();
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[8px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-xl z-40"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                  Notifications
                </p>
                <h3 className="text-sm font-black text-[var(--text-1)]">
                  {notifications.length === 0
                    ? "All caught up"
                    : `${notifications.length} recent`}
                </h3>
              </div>
              {onNavigateToOrders && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleItemClick}
                  className="rounded-md px-2 py-1 text-[11px] font-bold text-[var(--accent-text)] hover:bg-[var(--accent-muted)]"
                >
                  View all
                </button>
              )}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Inbox className="h-6 w-6 text-[var(--text-3)]" />
                  <p className="text-xs font-semibold text-[var(--text-2)]">
                    No notifications yet
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    New orders and status changes will show up here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border-soft)]">
                  {notifications.map((n) => {
                    const style = KIND_STYLE[n.kind];
                    const Icon = style.Icon;
                    const isUnread =
                      n.createdAt > lastSeen &&
                      n.kind !== "REJECTED";
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={handleItemClick}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--canvas-sub)] transition"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.fg}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-1)] truncate">
                                {n.title}
                              </span>
                              {isUnread && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[var(--text-3)]">
                              #{n.orderNo} · {n.detail} ·{" "}
                              {formatPrice(n.total, cur)}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-[var(--text-3)]">
                              {timeAgo(n.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
