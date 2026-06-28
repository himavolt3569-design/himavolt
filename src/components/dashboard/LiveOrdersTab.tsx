"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Truck,
  RefreshCw,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Zap,
  ShieldAlert,
} from "lucide-react";
import {
  useLiveOrders,
  type LiveOrder,
  type LiveOrderStatus,
} from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { resolvePrintSettings } from "@/lib/print-settings";
import { printKOT } from "@/lib/print-kot";
import DineInRequestModal from "@/components/modals/DineInRequestModal";
import { SkeletonOrderCard } from "@/components/shared/Skeleton";
import { apiFetch } from "@/lib/api-client";
import gsap from "gsap";

const STATUS_CONFIG: Record<
  LiveOrderStatus,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "New",
    bg: "bg-[var(--accent)]",
    text: "text-[var(--accent)]",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: CheckCircle2,
  },
  
  
  
  
  REJECTED: {
    label: "Rejected",
    bg: "bg-red-100",
    text: "text-red-600",
    icon: XCircle,
  },
};

const FILTER_OPTIONS: { value: LiveOrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "PENDING", label: "New" },
  { value: "ACCEPTED", label: "Accepted" },
  
  
  
];

function PreparingClock() {
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(handRef.current!, {
        rotation: 360,
        duration: 1.5,
        repeat: -1,
        ease: "linear",
        transformOrigin: "bottom center",
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={clockRef}
      className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-muted)]"
    >
      <div className="absolute top-1/2 left-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-hover)]" />
      <div
        ref={handRef}
        className="absolute bottom-1/2 left-1/2 h-1.5 w-px -translate-x-1/2 rounded-full bg-[var(--accent-hover)] origin-bottom"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: LiveOrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}
    >
      {status === "ACCEPTED" ? (
        <PreparingClock />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {cfg.label}
    </span>
  );
}

function TimeAgo({ ts }: { ts: string }) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60)
    return (
      <span className="text-[11px] text-[var(--text-3)]">{secs}s ago</span>
    );
  const mins = Math.floor(secs / 60);
  if (mins < 60)
    return (
      <span className="text-[11px] text-[var(--text-3)]">{mins}m ago</span>
    );
  return (
    <span className="text-[11px] text-[var(--text-3)]">
      {Math.floor(mins / 60)}h ago
    </span>
  );
}

function PendingExpiryBadge({ createdAt }: { createdAt: string }) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageMins = Math.floor(ageMs / 60000);
  if (ageMins < 25) return null;
  const remaining = 30 - ageMins;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
      <AlertTriangle className="h-3 w-3" />{" "}
      {remaining <= 0 ? "Expiring..." : `${remaining}m left`}
    </span>
  );
}

function OrderAgeBadge({ createdAt }: { createdAt: string }) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageMins = Math.floor(ageMs / 60000);
  const ageHrs = Math.floor(ageMins / 60);

  let color = "bg-emerald-100 text-emerald-700";
  let label = `${ageMins}m`;

  if (ageMins >= 120) {
    color = "bg-red-100 text-red-700";
    label =
      ageHrs >= 24
        ? `${Math.floor(ageHrs / 24)}d ${ageHrs % 24}h`
        : `${ageHrs}h ${ageMins % 60}m`;
  } else if (ageMins >= 60) {
    color = "bg-orange-100 text-orange-700";
    label = `${ageHrs}h ${ageMins % 60}m`;
  } else if (ageMins >= 30) {
    color = "bg-amber-100 text-amber-700";
    label = `${ageMins}m`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}
    >
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function StaleOrdersBanner({
  restaurantId,
}: {
  restaurantId: string | undefined;
}) {
  const [staleData, setStaleData] = useState<{
    total: number;
    pending: number;
    accepted: number;
  } | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<{ total: number } | null>(null);
  const { refresh } = useLiveOrders();

  const fetchStale = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch<{
        stale: {
          total: number;
          pending: number;
          accepted: number;
        };
      }>(`/api/restaurants/${restaurantId}/orders/cleanup`);
      setStaleData(data.stale);
    } catch {
      /* ignore */
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchStale();
    const iv = setInterval(fetchStale, 60000);
    return () => clearInterval(iv);
  }, [fetchStale]);

  const handleCleanup = async () => {
    if (!restaurantId || cleaning) return;
    setCleaning(true);
    try {
      const data = await apiFetch<{
        counts: {
          pendingRejected: number;
          acceptedRejected: number;
        };
      }>(`/api/restaurants/${restaurantId}/orders/cleanup`, { method: "POST" });
      const total =
        data.counts.pendingRejected +
        data.counts.acceptedRejected;
      setResult({ total });
      await refresh();
      await fetchStale();
      setTimeout(() => setResult(null), 5000);
    } catch {
      /* ignore */
    } finally {
      setCleaning(false);
    }
  };

  if (!staleData || staleData.total === 0) {
    if (result) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3"
        >
          <Zap className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">
            Cleaned up {result.total} stale order{result.total !== 1 ? "s" : ""}
          </span>
        </motion.div>
      );
    }
    return null;
  }

  const parts: string[] = [];
  if (staleData.pending > 0) parts.push(`${staleData.pending} pending`);
  if (staleData.accepted > 0) parts.push(`${staleData.accepted} accepted`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800">
            {staleData.total} stale order{staleData.total !== 1 ? "s" : ""} need
            attention
          </p>
          <p className="text-[11px] text-amber-600">{parts.join(" \u2022 ")}</p>
        </div>
      </div>
      <button
        onClick={handleCleanup}
        disabled={cleaning}
        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
      >
        {cleaning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        {cleaning ? "Cleaning..." : "Auto-Clean All"}
      </button>
    </motion.div>
  );
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  ESEWA: Wallet,
  KHALTI: Wallet,
  BANK: Banknote,
  CASH: DollarSign,
};

const PAYMENT_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank",
  CASH: "Cash",
  COUNTER: "Manual Pay",
  DIRECT: "Fast Pay",
};

function PaymentBadge({ method, status }: { method: string; status: string }) {
  const Icon = PAYMENT_ICONS[method] || CreditCard;
  const label = PAYMENT_LABELS[method] || method;
  const isPaid = status === "COMPLETED";
  const isDirectPay = method === "DIRECT";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isPaid
          ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
          : isDirectPay
            ? "bg-teal-100 text-teal-700"
            : "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20"
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
      {isPaid ? " Paid" : isDirectPay ? " → Counter" : " UNPAID"}
    </span>
  );
}

export default function LiveOrdersTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const {
    orders,
    loading,
    updatingIds,
    refresh,
    acceptOrder,
    rejectOrder,
  } = useLiveOrders();
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<LiveOrderStatus | "ALL">(
    "ALL",
  );

  const filtered = orders.filter(
    (o) => filterStatus === "ALL" || o.status === filterStatus,
  );

  const newCount = orders.filter((o) => o.status === "PENDING").length;

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonOrderCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StaleOrdersBanner restaurantId={selectedRestaurant?.id} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-1)] tracking-tight">
            Live Orders
          </h2>
          <p className="text-sm text-[var(--text-2)] mt-1 font-medium">
            {newCount > 0 ? (
              <span className="font-bold text-[var(--accent)] flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                </span>
                {newCount} new order{newCount > 1 ? "s" : ""} waiting
              </span>
            ) : (
              "All clear! Tracking live orders seamlessly."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#fef9ef]/80 border border-[var(--accent-border)]/50 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
            <div className="flex h-2 w-2 items-center justify-center">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </div>
            <span className="text-[11px] font-bold text-[var(--accent-text)] uppercase tracking-wider">
              Live Sync
            </span>
          </div>
          <button
            onClick={() => refresh()}
            className="rounded-full bg-[var(--canvas)]/80 p-2 shadow-sm border border-[var(--border-soft)] hover:bg-[var(--canvas)] hover:shadow-md transition-all active:scale-95"
          >
            <RefreshCw
              className={`h-4 w-4 text-[var(--text-2)] ${loading ? "animate-spin text-[var(--accent)]" : ""}`}
              style={{ animationDuration: "1s" }}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-all shadow-sm border ${
              filterStatus === opt.value
                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white border-transparent"
                : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--canvas-sub)] focus:ring-2 focus:ring-[var(--accent)]/20"
            }`}
          >
            {opt.label}
            {opt.value === "PENDING" && newCount > 0 && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] shadow-sm ${filterStatus === opt.value ? "bg-[var(--canvas)]/20 text-white" : "bg-[var(--accent)] text-white"}`}
              >
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders — desktop table + mobile cards */}
      <div>
        <div className="hidden md:block overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--canvas)]/70 backdrop-blur-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--canvas)]/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Table
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Time
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-20 text-center text-sm font-medium text-[var(--text-3)]"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-[var(--canvas-sub)] flex items-center justify-center border border-[var(--border-soft)]">
                          <PackageCheck className="h-5 w-5 text-[var(--text-3)]" />
                        </div>
                        No orders matching this status
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <motion.tr
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedOrder(order)}
                      className={`border-b border-[var(--border-soft)] transition-all hover:bg-[var(--canvas)]/80 last:border-b-0 cursor-pointer ${
                        order.status === "PENDING"
                          ? "bg-[var(--accent-muted)]"
                          : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-[var(--text-1)]">
                          {order.orderNo}
                        </span>
                        {order.note && (
                          <p className="text-[10px] text-[var(--text-3)] mt-0.5 italic">
                            &ldquo;{order.note}&rdquo;
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-lg font-black text-[var(--accent-text)] ring-2 ring-[var(--accent-border)]/60">
                          {order.tableNo ?? "–"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-[var(--text-2)] space-y-0.5">
                          {order.items.slice(0, 2).map((item, i) => (
                            <div key={i}>
                              <span className="font-semibold">
                                {item.quantity}×
                              </span>{" "}
                              {item.name}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[var(--text-3)]">
                              +{order.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-[var(--text-1)]">
                        {formatPrice(order.total, cur)}
                      </td>
                      <td className="px-4 py-4">
                        {order.payment ? (
                          <PaymentBadge
                            method={order.payment.method}
                            status={order.payment.status}
                          />
                        ) : (
                          <span className="text-[10px] text-[var(--text-3)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <OrderAgeBadge createdAt={order.createdAt} />
                          {order.status === "PENDING" && (
                            <PendingExpiryBadge createdAt={order.createdAt} />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <OrderActions
                          order={order}
                          busy={updatingIds.has(order.id)}
                          onAccept={() => acceptOrder(order.id)}
                          onReject={(reason) => rejectOrder(order.id, reason)}
                          
                          
                          
                        />
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {filtered.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setSelectedOrder(order)}
                className={`rounded-2xl border bg-[var(--canvas)] p-4 shadow-sm ${
                  order.status === "PENDING"
                    ? "border-[var(--accent-border)] bg-[var(--accent)]0/30"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[var(--text-1)]">
                        {order.orderNo}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-sm font-black text-[var(--accent-text)] ring-2 ring-[var(--accent-border)]/60">
                        {order.tableNo ?? "–"}
                      </span>
                      <span className="text-xs font-bold text-[var(--accent-text)]">
                        Table {order.tableNo ?? "–"}
                      </span>
                      <OrderAgeBadge createdAt={order.createdAt} />
                      {order.status === "PENDING" && (
                        <PendingExpiryBadge createdAt={order.createdAt} />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[var(--text-1)]">
                    {formatPrice(order.total, cur)}
                  </span>
                </div>
                {order.payment && (
                  <div className="mb-2">
                    <PaymentBadge
                      method={order.payment.method}
                      status={order.payment.status}
                    />
                  </div>
                )}
                <div className="text-xs text-[var(--text-2)] mb-3 space-y-0.5">
                  {order.items.map((item, i) => (
                    <div key={i}>
                      {item.quantity}× {item.name}
                    </div>
                  ))}
                </div>
                <OrderActions
                  order={order}
                  busy={updatingIds.has(order.id)}
                  onAccept={() => acceptOrder(order.id)}
                  onReject={(reason) => rejectOrder(order.id, reason)}
                  
                  
                  
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Dine-in modal */}
      <DineInRequestModal
        order={selectedOrder}
        currency={cur}
        onClose={() => setSelectedOrder(null)}
        onAccept={(id) => {
          acceptOrder(id, undefined);
          setSelectedOrder(null);
        }}
        onReject={(id, reason) => {
          rejectOrder(id, reason);
          setSelectedOrder(null);
        }}
        onPrintKOT={() => {
          if (!selectedOrder) return;
          const s = resolvePrintSettings(selectedRestaurant);
          printKOT(
            selectedOrder.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
            })),
            {
              restaurantName: selectedRestaurant?.name,
              tableNo: selectedOrder.tableNo,
              orderNo: selectedOrder.orderNo,
              guestName: selectedOrder.user?.name ?? null,
              width: s.kitchenWidth,
            },
          );
        }}
      />
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  busy,
  icon: Icon,
  label,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  icon: typeof Clock;
  label: string;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      // Still guard against a double-submit while the PATCH is in flight, but
      // don't show an "Updating…" spinner — the status change is already applied
      // optimistically, so the action should read as instant.
      disabled={disabled || busy}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function OrderActions({
  order,
  busy,
  onAccept,
  onReject,
}: {
  order: LiveOrder;
  busy: boolean;
  onAccept: () => void;
  onReject: (reason: string) => void;
}) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  if (order.status === "PENDING") {
    if (showRejectReason) {
      return (
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            type="text"
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={busy}
            className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-medium outline-none focus:ring-2 focus:ring-red-500/20 text-black dark:text-white bg-transparent"
          />
          <ActionButton
            onClick={() => onReject(rejectReason)}
            busy={busy}
            icon={XCircle}
            label="Confirm"
            className="bg-red-500 text-white hover:bg-red-600"
          />
          <ActionButton
            onClick={() => setShowRejectReason(false)}
            disabled={busy}
            icon={XCircle}
            label="Cancel"
            className="bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <ActionButton
          onClick={(e) => stop(e, () => onAccept())}
          disabled={busy}
          icon={CheckCircle2}
          label="Accept"
          className="bg-[var(--text-1)] text-white hover:bg-[var(--text-2)]"
        />
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setShowRejectReason(true);
          }}
          busy={busy}
          icon={XCircle}
          label="Reject"
          className="border border-red-200 text-red-500 hover:bg-red-50"
        />
      </div>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-[var(--text-3)] italic">
        {order.status === "ACCEPTED" ? "Completed" : "Rejected"}
      </span>
      {order.status === "ACCEPTED" && (
        <a
          href={`/bill/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] hover:text-[var(--accent)] transition-all"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          View Bill
        </a>
      )}
    </span>
  );
}
