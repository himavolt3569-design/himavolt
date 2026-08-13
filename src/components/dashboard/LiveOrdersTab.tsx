"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
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
  Printer,
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
import {
  openBillWindow,
  printBillForOrder,
  printPreBillForOrder,
} from "@/lib/print-bill";
import { runAcceptPrint } from "@/lib/orders/accept-print";
import DineInRequestModal from "@/components/modals/DineInRequestModal";
import { SkeletonOrderCard } from "@/components/shared/Skeleton";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import TableOrderBoard from "@/components/orders/TableOrderBoard";
import AcceptedReceiptPanel from "@/components/orders/AcceptedReceiptPanel";
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
  { value: "REJECTED", label: "Archived (Rejected)" },
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

function PendingExpiryBadge({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);
  const ageMs = now - new Date(createdAt).getTime();
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);
  const ageMs = now - new Date(createdAt).getTime();
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
    refresh,
    acceptOrder,
    rejectOrder,
    setOrders,
  } = useLiveOrders();
  const { showToast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<LiveOrderStatus | "ALL" | "ARCHIVED">("PENDING");
  const [busyOrderIds, _setBusyOrderIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const ordersQueryKey = ["orders", "live", selectedRestaurant?.id ?? null] as const;
  // Orders captured at the moment of an INITIAL accept (status was still
  // PENDING), so onSuccess knows this was the first round and not an add-on —
  // only the first round may print a bill.
  const pendingAcceptsRef = useRef<Map<string, LiveOrder>>(new Map());
  // The just-accepted order whose receipt is shown inline above the list.
  const [receiptOrder, setReceiptOrder] = useState<LiveOrder | null>(null);

  // Print an order's bill from anywhere on this screen. Paid orders get the
  // numbered receipt; everything else gets the provisional (unpaid) bill, so a
  // guest is never handed a document that misstates whether they have paid.
  const printOrderBill = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (order?.payment?.status === "COMPLETED") printBillForOrder(orderId);
      else printPreBillForOrder(orderId);
    },
    [orders],
  );

  // Accept / reject one ordering round (initial order or an add-on batch). The
  // server scopes the action to that round's items + handles the first-round
  // payment gate and order status, so earlier rounds stay untouched. Realtime
  // signal / SSE bring the query back to server truth shortly after — no
  // forced refetch needed on success, only to roll back a failed mutation.
  const roundActionMutation = useMutation({
    mutationFn: async ({
      orderId,
      roundAt,
      action,
      reason,
    }: {
      orderId: string;
      roundAt: string;
      action: "ACCEPT" | "REJECT";
      reason?: string;
    }) => {
      const rid = selectedRestaurant?.id;
      if (!rid) return;
      await apiFetch(`/api/restaurants/${rid}/orders/${orderId}/round`, {
        method: "PATCH",
        body: { roundAt, action, reason },
      });
    },
    onSuccess: (_data, { orderId, action }) => {
      if (action !== "ACCEPT") return;
      // `wasPending` was captured before the optimistic patch. Only the initial
      // acceptance prints — an add-on round must not spit out a second bill.
      const order = pendingAcceptsRef.current.get(orderId);
      pendingAcceptsRef.current.delete(orderId);
      if (!order) return;
      const settings = resolvePrintSettings(selectedRestaurant);
      // Surface the printable receipt right here in the orders list. This is
      // the whole point: staff must never navigate to Billing to print.
      if (settings.autoPrintBillOnAccept) setReceiptOrder(order);
      try {
        runAcceptPrint(
          orderId,
          {
            type: order.type,
            roomNo: order.roomNo,
            paymentStatus: order.payment?.status,
          },
          settings,
        );
      } catch {
        /* printing is best-effort — the round is accepted either way */
      }
    },
    onMutate: async ({ orderId, roundAt, action }) => {
      await queryClient.cancelQueries({ queryKey: ordersQueryKey, exact: true });
      const previous = queryClient.getQueryData<LiveOrder[]>(ordersQueryKey);
      const before = previous?.find((o) => o.id === orderId);
      if (action === "ACCEPT" && before?.status === "PENDING") {
        pendingAcceptsRef.current.set(orderId, before);
      }
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: o.items.map((i) =>
              i.createdAt === roundAt
                ? { ...i, kitchenStatus: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" }
                : i
            ),
          };
        })
      );
      return { previous };
    },
    onError: (err, { orderId }, context) => {
      pendingAcceptsRef.current.delete(orderId);
      if (context?.previous) queryClient.setQueryData(ordersQueryKey, context.previous);
      showToast(
        err instanceof Error ? err.message : "Action failed, please retry",
        "error",
      );
    },
  });

  const roundAction = useCallback(
    (orderId: string, roundAt: string, action: "ACCEPT" | "REJECT", reason?: string) =>
      roundActionMutation.mutateAsync({ orderId, roundAt, action, reason }).catch(() => {}),
    [roundActionMutation],
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // "All Orders" means ALL orders. It used to hide rejected ones AND any
      // accepted order whose payment had completed, so accepting an order made
      // it disappear from the list staff were looking at — the single most
      // confusing thing this screen did. An order changing status must never
      // vanish; it just changes how it looks.
      if (filterStatus === "ALL") return true;
      if (filterStatus === "ARCHIVED")
        return (
          o.status === "REJECTED" ||
          (o.status === "ACCEPTED" && o.payment?.status === "COMPLETED")
        );
      if (filterStatus === "ACCEPTED") return o.status === "ACCEPTED";
      return o.status === filterStatus;
    });
  }, [orders, filterStatus]);

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

      {/* Printable receipt for the order just accepted — sits at the top of the
          list so it is impossible to miss, and keeps printing on this screen. */}
      <AcceptedReceiptPanel
        order={receiptOrder}
        currency={cur}
        onDismiss={() => setReceiptOrder(null)}
      />

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
          <div className="flex items-center gap-2 bg-[var(--accent-muted)]/80 border border-[var(--accent-border)]/50 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
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
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-sm font-medium text-[var(--text-3)]">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--canvas-sub)] flex items-center justify-center border border-[var(--border-soft)]">
              <PackageCheck className="h-5 w-5 text-[var(--text-3)]" />
            </div>
            No orders matching this status
          </div>
        </div>
      ) : filterStatus !== "ARCHIVED" ? (
        <TableOrderBoard
          orders={filtered}
          currency={cur}
          busyOrderIds={busyOrderIds}
          onAcceptRound={(o, roundAt) => roundAction(o.id, roundAt, "ACCEPT")}
          onRejectRound={(o, roundAt, meta, reason) => roundAction(o.id, roundAt, "REJECT", reason)}
          onPrintBill={(o) => printOrderBill(o.id)}
        />
      ) : (
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
                        {order.status === "REJECTED" ? (
                          <span className="text-[11px] font-bold text-red-500">Rejected</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                printOrderBill(order.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-[var(--accent-hover)]"
                            >
                              <Printer className="h-3 w-3" />
                              Print
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openBillWindow(order.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] transition-all hover:bg-[var(--canvas-sub)]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </button>
                          </div>
                        )}
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
                {order.status === "REJECTED" ? (
                  <div className="mt-3 flex justify-end">
                    <span className="text-[11px] font-bold text-red-500">Rejected</span>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printOrderBill(order.id);
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-[12px] font-bold text-white transition-all hover:bg-[var(--accent-hover)]"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Bill
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openBillWindow(order.id);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2.5 text-[12px] font-bold text-[var(--text-2)] transition-all hover:bg-[var(--canvas-sub)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* Dine-in modal */}
      <DineInRequestModal
        order={selectedOrder}
        currency={cur}
        onClose={() => setSelectedOrder(null)}
        onAccept={(id) => {
          const accepting = selectedOrder;
          acceptOrder(id, undefined);
          // Same inline receipt as the board's Accept — the modal path must not
          // be the one place staff still have to go hunting for a print button.
          if (accepting && resolvePrintSettings(selectedRestaurant).autoPrintBillOnAccept) {
            setReceiptOrder(accepting);
          }
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