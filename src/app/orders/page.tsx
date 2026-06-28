"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  Clock,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  Loader2,
  ChevronRight,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { useActiveTableSession } from "@/hooks/useActiveTableSession";
import { useOrder } from "@/context/OrderContext";
import { useCart } from "@/context/CartContext";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface UserOrder {
  id: string;
  orderNo: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  type: string;
  tableNo: number | null;
  roomNo: string | null;
  createdAt: string;
  items: OrderItem[];
  payment: {
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  bill: {
    billNo: string;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    total: number;
  } | null;
  restaurant: {
    name: string;
    slug: string;
    imageUrl: string | null;
    currency?: string;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pending",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)]",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: PackageCheck,
  },
  PREPARING: {
    label: "Preparing",
    color: "text-white",
    bg: "bg-[var(--accent)]",
    icon: ChefHat,
  },
  READY: {
    label: "Ready",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-muted)]",
    icon: PackageCheck,
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-[var(--text-2)]",
    bg: "bg-[var(--surface)]",
    icon: Truck,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: XCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: XCircle,
  },
};

const TERMINAL_STATUSES = ["ACCEPTED", "REJECTED", "REJECTED"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${config.bg} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ItemsPreview({ items }: { items: OrderItem[] }) {
  const shown = items.slice(0, 3);
  const remaining = items.length - shown.length;

  return (
    <p className="text-xs text-[var(--text-2)] truncate">
      {shown.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
      {remaining > 0 && (
        <span className="text-[var(--text-3)]"> + {remaining} more</span>
      )}
    </p>
  );
}

function OrderCard({
  order,
  index,
}: {
  order: UserOrder;
  index: number;
}) {
  const isActive = !TERMINAL_STATUSES.includes(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={`/track/${order.id}`}
        className={`block rounded-2xl border bg-[var(--canvas)] p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${
          isActive
            ? "border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]"
            : "border-[var(--border)]"
        }`}
      >
        <div className="flex gap-3">
          <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-[var(--surface)]">
            {order.restaurant.imageUrl ? (
              <Image
                src={order.restaurant.imageUrl}
                alt={order.restaurant.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--accent-muted)]">
                <UtensilsCrossed className="h-6 w-6 text-[var(--accent)]" />
              </div>
            )}
            {isActive && (
              <div className="absolute top-1 right-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-1)] truncate">
                  {order.restaurant.name}
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  #{order.orderNo} &middot; {formatDate(order.createdAt)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)] shrink-0 mt-0.5" />
            </div>

            <div className="mt-2">
              <ItemsPreview items={order.items} />
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <StatusBadge status={order.status} />
              <span className="text-sm font-extrabold text-[var(--accent)]">
                {formatPrice(order.total, order.restaurant.currency ?? "NPR")}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TableSessionOrderView() {
  const { activeOrder, restoreFromStorage } = useOrder();
  const { initForRestaurant } = useCart();
  const activeSession = useActiveTableSession();

  // If the customer navigates directly to /orders (e.g. re-scanned the QR and
  // tapped the Orders tab before the menu page ran restoreFromStorage), we
  // proactively restore their order from localStorage here.
  useEffect(() => {
    if (!activeOrder && activeSession?.restaurantId) {
      restoreFromStorage(activeSession.restaurantId);
    }
    if (activeSession?.restaurantId && activeSession.restaurantSlug) {
      initForRestaurant(activeSession.restaurantId, activeSession.restaurantSlug, "NPR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.restaurantId, activeSession?.tableNo]);

  if (!activeOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center max-w-sm"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-muted)] mb-5">
            <ShoppingBag className="h-12 w-12 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">
            No orders yet
          </h2>
          <p className="text-sm text-[var(--text-2)] max-w-xs mb-6">
            Place your first order from the menu!
          </p>
          {activeSession && (
            <Link
              href={`/menu/${activeSession.restaurantSlug}?table=${activeSession.tableNo}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Go to Menu
            </Link>
          )}
        </motion.div>
      </div>
    );
  }

  const isActive = !TERMINAL_STATUSES.includes(activeOrder.status);
  const config = STATUS_CONFIG[activeOrder.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
              <Receipt className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold text-[var(--text-1)]">
                Your Order
              </h1>
              <p className="text-[11px] text-[var(--text-3)]">
                Table {activeOrder.tableNo}
              </p>
            </div>
            {isActive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-text)]">
                  Active
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href={`/track/${activeOrder.id}`}
            className={`block rounded-2xl border bg-[var(--canvas)] p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${
              isActive
                ? "border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]"
                : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-[var(--text-3)]">
                  Order #{activeOrder.orderNo}
                </p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  {new Date(activeOrder.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${config.bg} ${config.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-2)]">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-[var(--text-2)] font-medium">
                    Rs. {item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border-soft)] pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-1)]">Total</span>
              <span className="text-base font-extrabold text-[var(--accent)]">
                Rs. {activeOrder.total}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-[var(--text-3)]">
              <span>Tap to track order</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const activeSession = useActiveTableSession();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch<UserOrder[]>("/api/orders?limit=20");
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOrders();
  }, [isLoaded, isSignedIn, fetchOrders]);

  // Poll for active orders every 5 seconds
  useEffect(() => {
    if (!isSignedIn) return;

    const hasActiveOrders = orders.some(
      (o) => !TERMINAL_STATUSES.includes(o.status)
    );

    if (hasActiveOrders) {
      pollRef.current = setInterval(fetchOrders, 5000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isSignedIn, orders, fetchOrders]);

  const activeOrders = orders.filter(
    (o) => !TERMINAL_STATUSES.includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    TERMINAL_STATUSES.includes(o.status)
  );

  // Not signed in — show table session order or sign-in prompt
  if (isLoaded && !isSignedIn) {
    if (activeSession) {
      return <TableSessionOrderView />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)] mb-5">
            <Receipt className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">
            Sign in to view orders
          </h2>
          <p className="text-sm text-[var(--text-2)] mb-6">
            Sign in to see your order history and track active orders.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--text-2)]">
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--text-2)] mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchOrders();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
              <Receipt className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold text-[var(--text-1)]">
                My Orders
              </h1>
              {orders.length > 0 && (
                <p className="text-[11px] text-[var(--text-3)]">
                  {orders.length} order{orders.length !== 1 && "s"}
                </p>
              )}
            </div>
            {activeOrders.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-text)]">
                  {activeOrders.length} Active
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-20 space-y-6">
        {orders.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface)] mb-5">
              <ShoppingBag className="h-12 w-12 text-[var(--text-3)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">
              No orders yet
            </h2>
            <p className="text-sm text-[var(--text-2)] max-w-xs mb-6">
              When you place an order, it will appear here. Browse a restaurant
              menu to get started!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Explore Restaurants
            </Link>
          </motion.div>
        )}

        <AnimatePresence>
          {activeOrders.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <h2 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Active Orders
                </h2>
              </div>
              <div className="space-y-3">
                {activeOrders.map((order, i) => (
                  <OrderCard key={order.id} order={order} index={i} />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {pastOrders.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
              Past Orders
            </h2>
            <div className="space-y-3">
              {pastOrders.map((order, i) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={activeOrders.length + i}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
