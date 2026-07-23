"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  XCircle,
  ArrowLeft,
  ChevronDown,
  Timer,
  MapPin,
  Phone,
  UtensilsCrossed,
  Copy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { orderTopic } from "@/lib/realtime-topics";
import { formatPrice } from "@/lib/currency";

/** Returns a human-readable "X minutes ago" string. No fake ETAs. */
function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff} seconds ago`;
  const m = Math.floor(diff / 60);
  if (m === 1) return "1 minute ago";
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h === 1) return "1 hour ago";
  return `${h} hours ago`;
}

interface TrackItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addOns: string | null;
  kitchenStatus: string | null;
  rejectedReason: string | null;
  prepTimeSnapshot: string | null;
  menuItem: { imageUrl: string | null; prepTime: string | null } | null;
}

interface TrackOrder {
  id: string;
  orderNo: string;
  trackToken: string | null;
  status: string;
  kitchenStatus: string | null;
  rejectReason: string | null;
  tableNo: number | null;
  roomNo: string | null;
  guestName: string | null;
  type: string;
  note: string | null;
  subtotal: number;
  tax: number;
  total: number;
  sourceType: string | null;
  createdAt: string;
  acceptedAt: string | null;
  items: TrackItem[];
  restaurant: {
    name: string;
    slug: string;
    currency: string;
    address: string;
    phone: string;
  };
}

function statusLabel(order: TrackOrder): { text: string; sub: string; color: string; progress: number } {
  const ks = order.kitchenStatus ?? order.status;
  const accepted = timeAgo(order.acceptedAt);

  if (order.status === "REJECTED" || ks === "REJECTED") {
    const customerCancelled = order.rejectReason === "Cancelled by customer";
    return {
      text: customerCancelled ? "Order Cancelled" : "Order Rejected",
      sub: customerCancelled
        ? "You cancelled this order."
        : order.rejectReason
          ? `Reason: ${order.rejectReason}`
          : "The restaurant was unable to fulfill your order.",
      color: "text-red-500",
      progress: 100, // Show full bar but red for error
    };
  }
  if (ks === "SERVED") {
    return { text: "Served!", sub: "Enjoy your meal.", color: "text-[var(--accent)]", progress: 100 };
  }
  if (ks === "READY") {
    return { text: "Ready for pickup", sub: accepted ? `Accepted ${accepted}` : "Your order is ready.", color: "text-[var(--accent)]", progress: 90 };
  }
  if (ks === "PREPARING") {
    return { text: "Preparing now", sub: accepted ? `Accepted ${accepted}` : "Kitchen is working on your order.", color: "text-[var(--accent)]", progress: 60 };
  }
  if (ks === "ACCEPTED" || order.status === "ACCEPTED") {
    return { text: "Served!", sub: accepted ? `Completed ${accepted}` : "Enjoy your meal.", color: "text-[var(--accent)]", progress: 100 };
  }
  return {
    text: "Order placed",
    sub: timeAgo(order.createdAt) ? `Placed ${timeAgo(order.createdAt)}` : "Waiting for kitchen.",
    color: "text-blue-500",
    progress: 10,
  };
}

function ItemRow({ item, currency }: { item: TrackItem; currency: string }) {
  const [open, setOpen] = useState(false);
  const prepTime = item.prepTimeSnapshot ?? item.menuItem?.prepTime ?? null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--canvas-sub)] transition-colors"
        aria-expanded={open}
      >
        {item.menuItem?.imageUrl ? (
          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-[var(--surface)]">
            <Image
              src={item.menuItem.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
            <UtensilsCrossed className="h-5 w-5 text-[var(--text-3)]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[10px] font-bold text-[var(--accent)]">
              {item.quantity}
            </span>
            <span className="text-sm font-semibold text-[var(--text-1)] truncate">
              {item.name}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
            {formatPrice(item.price * item.quantity, currency)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.kitchenStatus === "REJECTED" ? (
            <span className="text-[10px] font-bold text-red-500">Rejected</span>
          ) : item.kitchenStatus === "SERVED" ? (
            <span className="text-[10px] font-bold text-[var(--accent)]">Served</span>
          ) : item.kitchenStatus === "READY" ? (
            <span className="text-[10px] font-bold text-[var(--accent)]">Ready</span>
          ) : item.kitchenStatus === "PREPARING" ? (
            <span className="text-[10px] font-bold text-orange-500">Preparing</span>
          ) : null}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronDown className="h-4 w-4 text-[var(--text-3)]" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-soft)] space-y-2.5">
              {item.addOns && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                    Modifiers
                  </p>
                  <p className="text-xs text-[var(--text-2)]">{item.addOns}</p>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-[var(--text-3)]" />
                <span className="text-xs text-[var(--text-2)]">
                  {prepTime ? `Prep time: ${prepTime}` : "Prep time not set."}
                </span>
              </div>

              {item.kitchenStatus === "REJECTED" && item.rejectedReason && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-xs font-bold text-red-700">
                    Rejected: {item.rejectedReason}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvalidToken() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-1)] mb-1">
          Link expired or invalid
        </h2>
        <p className="text-sm text-[var(--text-2)] mb-6">
          This tracking link is no longer valid. If you have a receipt, you can
          look up your order at the restaurant.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function OrderTrackPage() {
  const params = useParams<{ trackToken: string }>();
  const trackToken = params.trackToken;

  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Polling ticks so the "X minutes ago" text refreshes every 30 s without a
  // server round-trip.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/order-track/${encodeURIComponent(trackToken)}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }
      const data: TrackOrder = await res.json();
      setOrder(data);
      setNotFound(false);
    } catch {
      // keep showing last known state
    } finally {
      setLoading(false);
    }
  }, [trackToken]);

  const cancelOrder = useCallback(async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(
        `/api/order-track/${encodeURIComponent(trackToken)}/cancel`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel order. Please contact staff.");
        setCancelConfirm(false);
        return;
      }
      setCancelConfirm(false);
      // Refetch immediately so the page shows the cancelled state
      await fetchOrder();
    } catch {
      setCancelError("Network error. Please try again.");
      setCancelConfirm(false);
    } finally {
      setCancelling(false);
    }
  }, [trackToken, fetchOrder]);

  // SSE real-time updates
  useEffect(() => {
    fetchOrder();

    let es: EventSource | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;

    try {
      es = new EventSource(`/api/order-track/${encodeURIComponent(trackToken)}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "order" && msg.order) {
            setOrder(msg.order);
            setLoading(false);
          } else if (msg.type === "error") {
            setNotFound(true);
            setLoading(false);
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!fallback) fallback = setInterval(fetchOrder, 5000);
      };
    } catch {
      fallback = setInterval(fetchOrder, 5000);
    }

    return () => {
      es?.close();
      if (fallback) clearInterval(fallback);
    };
  }, [trackToken, fetchOrder]);

  // Supabase Realtime push: once orderId is known, subscribe to the order topic
  // so status changes arrive instantly without waiting for the next SSE poll.
  useRealtimeSignal(order?.id ? orderTopic(order.id) : null, fetchOrder);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-3)]">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) return <InvalidToken />;

  const { text: statusText, sub: statusSub, color: statusColor, progress } = statusLabel(order);
  const isRejected = order.status === "REJECTED" || order.kitchenStatus === "REJECTED";
  const isDone = order.kitchenStatus === "SERVED" || order.status === "ACCEPTED";
  const isActive = !isRejected && progress < 100;
  const currency = order.restaurant.currency ?? "NPR";

  const NON_CANCELLABLE_KITCHEN = ["ACCEPTED", "PREPARING", "READY", "SERVED"];
  const isCancellable =
    order.status === "PENDING" &&
    !NON_CANCELLABLE_KITCHEN.includes(order.kitchenStatus ?? "");

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <Link
              href={`/menu/${order.restaurant.slug}${order.tableNo ? `?table=${order.tableNo}` : ""}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-[var(--text-1)]">Track Order</h1>
              <p className="text-[11px] text-[var(--text-3)]">{order.restaurant.name}</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-text)]">Live</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Order summary card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                Order
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xl font-black text-[var(--text-1)]">{order.orderNo}</p>
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--surface-alt)] rounded border border-[var(--border)] cursor-pointer hover:bg-[var(--border-soft)] transition-colors active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(order.trackToken || "");
                    alert("Tracking code copied to clipboard!");
                  }}
                  title="Copy Tracking Code"
                >
                  <span className="text-[10px] font-mono text-[var(--text-2)]">{order.trackToken}</span>
                  <Copy className="h-3 w-3 text-[var(--text-3)]" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {order.tableNo && (
                  <span className="text-xs text-[var(--text-2)]">Table {order.tableNo}</span>
                )}
                {order.roomNo && (
                  <span className="text-xs text-purple-600 font-medium">Room {order.roomNo}</span>
                )}
                <span className="text-xs text-[var(--text-3)]">
                  {order.type === "DINE_IN" ? "Dine In" : order.type === "TAKEAWAY" ? "Takeaway" : "Delivery"}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[var(--text-3)]">
                {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-lg font-extrabold text-[var(--accent)] mt-0.5">
                {formatPrice(order.total, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-soft)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--surface)] flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-[var(--text-2)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-1)] truncate">{order.restaurant.name}</p>
              {order.restaurant.address && (
                <p className="text-[11px] text-[var(--text-3)] truncate">{order.restaurant.address}</p>
              )}
            </div>
            {order.restaurant.phone && (
              <a
                href={`tel:${order.restaurant.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors shrink-0"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        </motion.div>

        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-5 shadow-sm"
        >
          <div className="flex flex-col items-center py-2 text-center">
            <motion.div
              key={statusText}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 ${
                isRejected
                  ? "bg-red-100"
                  : isDone
                  ? "bg-[var(--accent-muted)]"
                  : "bg-[var(--accent-muted)]"
              }`}
            >
              {isRejected ? (
                <XCircle className="h-8 w-8 text-red-500" />
              ) : isDone ? (
                <CheckCircle2 className="h-8 w-8 text-[var(--accent)]" />
              ) : order.kitchenStatus === "PREPARING" ? (
                <ChefHat className="h-8 w-8 text-[var(--accent)]" />
              ) : order.kitchenStatus === "ACCEPTED" ? (
                <Clock className="h-8 w-8 text-[var(--accent)]" />
              ) : (
                <Clock className="h-8 w-8 text-blue-500" />
              )}
            </motion.div>

            <h2 className={`text-lg font-extrabold ${statusColor}`}>{statusText}</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">{statusSub}</p>

            {isRejected && order.rejectReason && (
              <p className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-xs font-bold text-red-700 text-left w-full">
                Reason: {order.rejectReason}
              </p>
            )}

            {order.note && (
              <p className="mt-3 rounded-xl bg-[var(--surface)] px-4 py-2 text-xs text-[var(--text-2)] italic">
                Note: {order.note}
              </p>
            )}

            {/* Progress Bar */}
            <div className="mt-5 w-full">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--border-soft)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className={`absolute left-0 top-0 h-full rounded-full ${isRejected ? "bg-red-500" : "bg-[var(--accent)]"}`}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Customer cancel */}
        {isCancellable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {cancelError && (
              <p className="mb-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700 text-center">
                {cancelError}
              </p>
            )}
            {cancelConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setCancelConfirm(false); setCancelError(null); }}
                  disabled={cancelling}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Keep order
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setCancelConfirm(true); setCancelError(null); }}
                className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel order
              </button>
            )}
          </motion.div>
        )}

        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2 px-1">
            Items ({order.items.length})
          </h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <ItemRow key={item.id} item={item} currency={currency} />
            ))}
          </div>
        </motion.div>

        {/* Total summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl bg-[var(--canvas)] border border-[var(--border)] px-5 py-4"
        >
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[var(--text-2)]">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal, currency)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-xs text-[var(--text-2)]">
                <span>Tax</span>
                <span>{formatPrice(order.tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--text-1)]">Total</span>
              <span className="text-[var(--accent)]">{formatPrice(order.total, currency)}</span>
            </div>
          </div>
        </motion.div>

        <Link
          href={`/menu/${order.restaurant.slug}${order.tableNo ? `?table=${order.tableNo}` : ""}`}
          className="block w-full rounded-xl bg-[var(--text-1)] py-4 text-center text-sm font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] transition-colors shadow-md"
        >
          Back to Menu
        </Link>

        <div className="pb-8" />
      </div>
    </div>
  );
}
