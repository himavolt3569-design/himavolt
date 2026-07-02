"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  CreditCard,
  DollarSign,
  Wallet,
  Banknote,
  Check,
  Clock,
  Loader2,
  Search,
  Filter,
  Eye,
  X,
  Tag,
  TrendingUp,
  Printer,
  AlertCircle,
  CheckCircle2,
  Utensils,
  User as UserIcon,
  Banknote as BillIcon,
  ScanLine,
  ExternalLink,
  Truck,
  ShoppingCart,
  BedDouble,
  Trash2,
} from "lucide-react";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { useRestaurant } from "@/context/RestaurantContext";
import { autoPrintBill, printBillForOrder } from "@/lib/print-bill";
import ManualBillingTab from "@/components/dashboard/ManualBillingTab";
import { Zap } from "lucide-react";

/* Types */

interface BillOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  roomNo: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  type: string;
  deliveryFee: number;
  deliveryAddress: string | null;
  createdAt: string;
  deliveredAt: string | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    addOns?: string | null;
  }[];
  user: { name: string | null; email: string; phone: string | null } | null;
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    transactionId: string | null;
    paidAt: string | null;
    proofUrl?: string | null;
    proofUploadedAt?: string | null;
    rejectionNote?: string | null;
  } | null;
  bill: {
    id: string;
    billNo: string;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    total: number;
    paidVia: string | null;
  } | null;
}

interface DailySummary {
  totalOrders: number;
  completedOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  counterRevenue: number;
  onlineRevenue: number;
  pendingAmount: number;
  totalDiscount: number;
  byMethod?: Record<string, number>;
}

interface BillingTabProps {
  restaurantId: string;
  staffRole?: string;
  currency?: string;
}

interface StaffReportEntry {
  staffId: string;
  staffName: string;
  staffEmail: string;
  role: string;
  staffType: string;
  shift: { startTime: string; endTime: string; label: string | null } | null;
  orderCount: number;
  totalCollected: number;
  byMethod: Record<string, { count: number; amount: number }>;
  orders: { orderNo: string; amount: number; method: string; paidAt: string | null }[];
}

interface StaffReportData {
  date: string;
  grandTotal: number;
  grandOrderCount: number;
  staff: StaffReportEntry[];
}

/* Helpers */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function paymentMethodLabel(method: string) {
  const map: Record<string, string> = {
    ESEWA: "eSewa",
    KHALTI: "Khalti",
    BANK: "Bank Transfer",
    CASH: "Cash",
    COUNTER: "Manual Pay",
    DIRECT: "Fast Pay",
  };
  return map[method] || method;
}

function buildPaymentToast(order: BillOrder): string {
  const location = order.tableNo
    ? `Table ${order.tableNo}`
    : order.roomNo
      ? `Room ${order.roomNo}`
      : order.user?.name ?? "Guest";
  const total = order.bill?.total ?? order.total;
  const method = order.payment ? paymentMethodLabel(order.payment.method) : "Unknown";
  return `Payment confirmed — Order #${order.orderNo} · ${location} · ${order.items.length} item${order.items.length !== 1 ? "s" : ""} · ${total.toFixed(2)} via ${method}`;
}

function paymentMethodDesc(method: string) {
  const map: Record<string, string> = {
    COUNTER: "Staff records cash payment",
    DIRECT: "Customer pays at counter directly",
    CASH: "Cash on hand",
    ESEWA: "eSewa digital wallet",
    KHALTI: "Khalti digital wallet",
    BANK: "Bank transfer / cheque",
  };
  return map[method] || "";
}

function paymentMethodIcon(method: string) {
  switch (method) {
    case "ESEWA":
    case "KHALTI":
      return Wallet;
    case "BANK":
      return Banknote;
    case "COUNTER":
    case "DIRECT":
      return Receipt;
    case "CASH":
    default:
      return DollarSign;
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[var(--accent)] text-[var(--accent)]",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  READY: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  DELIVERED: "bg-[var(--surface)] text-[var(--text-2)]",
  CANCELLED: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
};

/* BillingTab Component */

type PayType = "all" | "cash" | "online";

function playBillingAlert() {
  try {
    const ctx = new AudioContext();
    // Three-tone alert: C5 → G5 → C6
    [523.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.18 + 0.35,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.35);
    });
  } catch {
    /* audio not available */
  }
}

function LiveBilling({
  restaurantId,
  staffRole,
  currency = "NPR",
}: BillingTabProps) {
  const { showToast } = useToast();
  const { selectedRestaurant } = useRestaurant();
  const queryClient = useQueryClient();
  const cur = currency;
  const [filter, setFilter] = useState<string>("unpaid");
  const [payType, setPayType] = useState<PayType>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<BillOrder | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [collectMethod, setCollectMethod] = useState<string>("CASH");
  const [collectTxn, setCollectTxn] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splitEntries, setSplitEntries] = useState<{ method: string; amount: string }[]>([
    { method: "CASH", amount: "" },
    { method: "ESEWA", amount: "" },
  ]);
  const [actionLoading, setActionLoading] = useState(false);
  const [clearingOrderId, setClearingOrderId] = useState<string | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "staff-report">("orders");
  const [staffReport, setStaffReport] = useState<StaffReportData | null>(null);
  const [staffReportLoading, setStaffReportLoading] = useState(false);
  const [staffReportDate, setStaffReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const knownOrderIds = useRef<Set<string>>(new Set());
  const knownPaymentStatuses = useRef<Map<string, string>>(new Map());
  const knownOrderTotals = useRef<Map<string, number>>(new Map());
  const isFirstSSE = useRef(true);
  const { data: streamData } = useSSE<{
    type: string;
    orders?: { id: string; orderNo: string; total: number; payment?: { method: string; status: string; proofUrl?: string | null } | null }[];
    newProofCount?: number;
  }>(
    restaurantId ? `/api/restaurants/${restaurantId}/billing/stream` : null,
  );

  // Tax & service charge configs
  const [taxRate, setTaxRate] = useState(13);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [scRate, setScRate] = useState(10);
  const [scEnabled, setScEnabled] = useState(true);

  const canDiscount =
    staffRole === "MANAGER" || staffRole === "SUPER_ADMIN" || !staffRole;

  const ordersQueryKey = ["billing", restaurantId, filter] as const;
  const summaryQueryKey = ["billing-summary", restaurantId] as const;

  // apiFetch still handles retry-on-503 (prod's 1-connection pool) and
  // request timeout underneath — React Query just orchestrates the cache on
  // top of it. `placeholderData: keepPreviousData` paints the previous
  // filter's list instantly while the new one loads in the background,
  // instead of a blank state.
  const ordersQuery = useQuery({
    queryKey: ordersQueryKey,
    queryFn: async () => {
      const data = await apiFetch<BillOrder[] | { orders?: BillOrder[] }>(
        `/api/restaurants/${restaurantId}/billing?filter=${filter}`,
      );
      // API returns an array directly; fall back to .orders wrapper for safety
      return Array.isArray(data) ? data : data.orders || [];
    },
    enabled: !!restaurantId,
    placeholderData: keepPreviousData,
  });
  const orders = ordersQuery.data ?? [];
  const ordersRef = useRef<BillOrder[]>([]);
  ordersRef.current = orders;

  const summaryQuery = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () =>
      apiFetch<DailySummary>(`/api/restaurants/${restaurantId}/billing/summary`),
    enabled: !!restaurantId,
    placeholderData: keepPreviousData,
  });
  const summary = summaryQuery.data ?? null;

  const loadOrders = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["billing", restaurantId] });
  }, [queryClient, restaurantId]);

  const loadSummary = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: summaryQueryKey });
  }, [queryClient, restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStaffReport = useCallback(async (date: string) => {
    setStaffReportLoading(true);
    try {
      const data = await apiFetch<StaffReportData>(
        `/api/restaurants/${restaurantId}/billing/staff-report?date=${date}`,
        { cacheTtl: 15_000 },
      );
      setStaffReport(data);
    } catch {
      showToast("Failed to load staff report", "error");
    }
    setStaffReportLoading(false);
  }, [restaurantId, showToast]);

  // Reset SSE dedup state + fetch tax config once per restaurant. Orders and
  // summary auto-fetch from their own useQuery above whenever restaurantId
  // (or filter) changes — no manual reload effect needed for those anymore.
  useEffect(() => {
    if (!restaurantId) return;
    isFirstSSE.current = true;
    knownOrderIds.current = new Set();
    knownPaymentStatuses.current = new Map();
    knownOrderTotals.current = new Map();
    apiFetch<{
      taxRate: number;
      taxEnabled: boolean;
      serviceChargeRate: number;
      serviceChargeEnabled: boolean;
    }>(`/api/restaurants/${restaurantId}/tax-config`, { cacheTtl: 300_000 })
      .then((cfg) => {
        setTaxRate(cfg.taxRate);
        setTaxEnabled(cfg.taxEnabled);
        setScRate(cfg.serviceChargeRate);
        setScEnabled(cfg.serviceChargeEnabled);
      })
      .catch(() => {});
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE-triggered refresh: alert on new orders AND payment confirmations
  useEffect(() => {
    if (!streamData || streamData.type !== "orders" || !streamData.orders) return;
    const incoming = streamData.orders;

    if (isFirstSSE.current) {
      // Seed known state on first snapshot — no alerts
      knownOrderIds.current = new Set(incoming.map((o) => o.id));
      incoming.forEach((o) => {
        if (o.payment?.status) knownPaymentStatuses.current.set(o.id, o.payment.status);
        knownOrderTotals.current.set(o.id, o.total);
      });
      isFirstSSE.current = false;
      return;
    }

    let needsRefresh = false;

    for (const o of incoming) {
      // Detect new orders
      if (!knownOrderIds.current.has(o.id)) {
        needsRefresh = true;
        playBillingAlert();
      }

      // Detect payment status transitions
      const prev = knownPaymentStatuses.current.get(o.id);
      const curr = o.payment?.status ?? null;

      // PENDING → AWAITING_VERIFICATION: customer uploaded proof — alert biller
      if (prev === "PENDING" && curr === "AWAITING_VERIFICATION") {
        needsRefresh = true;
        playBillingAlert();
        const fullOrder = ordersRef.current.find((ord) => ord.id === o.id);
        showToast(
          fullOrder
            ? `Order #${fullOrder.orderNo} — Customer uploaded payment proof. Verify to send to kitchen.`
            : "Customer uploaded payment proof — verification required",
          "info",
        );
      }

      // Any status → COMPLETED: payment confirmed
      if (prev !== undefined && prev !== "COMPLETED" && curr === "COMPLETED") {
        needsRefresh = true;
        playBillingAlert();
        const fullOrder = ordersRef.current.find((ord) => ord.id === o.id);
        showToast(
          fullOrder ? buildPaymentToast(fullOrder) : "Payment confirmed for a recent order",
          "success",
        );
      }

      // Detect total changes (customer added more items to the same running bill)
      const prevTotal = knownOrderTotals.current.get(o.id);
      if (prevTotal !== undefined && prevTotal !== o.total) {
        needsRefresh = true;
        playBillingAlert();
        showToast(
          `New items added to Order #${o.orderNo} (${formatPrice(o.total, selectedRestaurant?.currency ?? "NPR")})`,
          "info"
        );
      }

      // Update known statuses
      if (curr) knownPaymentStatuses.current.set(o.id, curr);
      knownOrderTotals.current.set(o.id, o.total);
    }

    knownOrderIds.current = new Set(incoming.map((o) => o.id));

    if (needsRefresh) {
      loadOrders();
      loadSummary();
    }
  }, [streamData, loadOrders, loadSummary, showToast]);

  // Marks the order paid in the cache immediately — if the current filter is
  // "unpaid" it drops out of the list right away instead of waiting for the
  // network round-trip and a full reload. Rolled back on failure.
  const collectPaymentMutation = useMutation({
    mutationFn: async (vars: { orderId: string; method: string; txn?: string }) => {
      await apiFetch(`/api/restaurants/${restaurantId}/billing/collect`, {
        method: "POST",
        body: {
          orderId: vars.orderId,
          method: vars.method,
          transactionId: vars.txn,
        },
      });
    },
    onMutate: async ({ orderId, method }) => {
      await queryClient.cancelQueries({ queryKey: ordersQueryKey });
      const previous = queryClient.getQueryData<BillOrder[]>(ordersQueryKey);
      queryClient.setQueryData<BillOrder[]>(ordersQueryKey, (prev) => {
        const list = prev ?? [];
        if (filter === "unpaid") return list.filter((o) => o.id !== orderId);
        return list.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment: {
                  ...(o.payment ?? { id: "", transactionId: null, paidAt: null }),
                  method,
                  status: "COMPLETED",
                  amount: o.bill?.total ?? o.total,
                },
              }
            : o,
        );
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ordersQueryKey, context.previous);
    },
  });

  const handleCollectPayment = async () => {
    if (!selectedOrder) return;
    const paidOrderId = selectedOrder.id;
    const orderNo = selectedOrder.orderNo;
    const method = collectMethod;
    const txn = collectTxn || undefined;
    const autoPrint = selectedRestaurant?.printAutoReceipt;

    // Optimistic close
    setShowCollect(false);
    setSelectedOrder(null);
    setCollectTxn("");

    try {
      await collectPaymentMutation.mutateAsync({ orderId: paidOrderId, method, txn });
      showToast(`Payment collected for Order #${orderNo}`, "success");
      if (autoPrint) autoPrintBill(paidOrderId);
      loadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to collect payment", "error");
    }
  };

  const handleVerifyBank = async (order: BillOrder, action: "VERIFY" | "REJECT") => {
    if (!order.payment) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/billing/verify-bank`, {
        method: "POST",
        body: {
          paymentId: order.payment.id,
          action,
        },
      });
      showToast(
        action === "VERIFY"
          ? `Bank transfer verified for Order #${order.orderNo}`
          : `Bank transfer rejected for Order #${order.orderNo}`,
        action === "VERIFY" ? "success" : "info",
      );
      loadOrders();
      loadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to process bank verification", "error");
    }
    setActionLoading(false);
  };

  const handleApplyDiscount = async () => {
    if (!selectedOrder) return;
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/billing/discount`, {
        method: "POST",
        body: {
          orderId: selectedOrder.id,
          amount,
          reason: discountReason || undefined,
        },
      });
      showToast(`Discount of ${formatPrice(amount, cur)} applied to Order #${selectedOrder.orderNo}`, "success");
      setShowDiscount(false);
      setDiscountAmount("");
      setDiscountReason("");
      setSelectedOrder(null);
      loadOrders();
      loadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to apply discount", "error");
    }
    setActionLoading(false);
  };

  const handleSplitPayment = async () => {
    if (!selectedOrder) return;
    const billTotal = selectedOrder.bill?.total ?? selectedOrder.total;
    const active = splitEntries.filter((e) => e.method && parseFloat(e.amount) > 0);
    if (active.length < 2) {
      showToast("Enter at least 2 payment methods with amounts", "error");
      return;
    }
    const splitTotal = active.reduce((s, e) => s + parseFloat(e.amount), 0);
    if (Math.abs(splitTotal - billTotal) > 1) {
      showToast(
        `Split total (${formatPrice(splitTotal, cur)}) must equal bill total (${formatPrice(billTotal, cur)})`,
        "error",
      );
      return;
    }
    const paidOrderId = selectedOrder.id;
    setActionLoading(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/billing/split`, {
        method: "POST",
        body: {
          orderId: paidOrderId,
          splits: active.map((e) => ({ method: e.method, amount: parseFloat(e.amount) })),
        },
      });
      showToast(`Split payment collected for Order #${selectedOrder.orderNo}`, "success");
      if (selectedRestaurant?.printAutoReceipt) autoPrintBill(paidOrderId);
      setShowSplit(false);
      setSelectedOrder(null);
      setSplitEntries([{ method: "CASH", amount: "" }, { method: "ESEWA", amount: "" }]);
      loadOrders();
      loadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to process split payment", "error");
    }
    setActionLoading(false);
  };

  const handleClearTable = async (order: BillOrder) => {
    if (!order.tableNo) return;
    setClearingOrderId(order.id);
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/table-session/clear`,
        {
          method: "POST",
          body: { orderId: order.id, tableNo: order.tableNo },
        },
      );
      loadOrders();
    } catch {
      showToast("Failed to clear table", "error");
    }
    setClearingOrderId(null);
  };

  const isCashOrder = (o: BillOrder) =>
    !o.payment || o.payment.method === "CASH";
  const isOnlineOrder = (o: BillOrder) =>
    o.payment && o.payment.method !== "CASH";
  const isPaid = (o: BillOrder) => o.payment?.status === "COMPLETED";

  const filtered = orders.filter((o) => {
    if (payType === "cash" && !isCashOrder(o)) return false;
    if (payType === "online" && !isOnlineOrder(o)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.user?.name?.toLowerCase().includes(q) ||
      o.tableNo?.toString().includes(q)
    );
  });

  const cashCount = orders.filter(isCashOrder).length;
  const onlineCount = orders.filter((o) => !!isOnlineOrder(o)).length;

  return (
    <div className="space-y-5">

      {/* Proof Image Preview Modal */}
      <AnimatePresence>
        {proofPreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setProofPreviewUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full bg-[var(--canvas)] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-bold text-[var(--text-1)]">Payment Proof</span>
                <div className="flex items-center gap-2">
                  <a
                    href={proofPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open original
                  </a>
                  <button
                    onClick={() => setProofPreviewUrl(null)}
                    className="rounded-lg p-1.5 hover:bg-[var(--surface)] transition-colors"
                  >
                    <X className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreviewUrl}
                alt="Payment proof"
                className="w-full max-h-[70vh] object-contain bg-[var(--canvas-sub)]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Revenue"
            value={formatPrice(summary.totalRevenue, cur)}
            icon={TrendingUp}
            color="text-[var(--accent-text)]"
            bg="bg-[var(--accent-muted)]"
          />
          <SummaryCard
            label="Cash Collected"
            value={formatPrice(summary.cashRevenue, cur)}
            icon={DollarSign}
            color="text-blue-600"
            bg="bg-blue-50"
            sub={summary.counterRevenue > 0 ? `+${formatPrice(summary.counterRevenue, cur)} counter` : undefined}
          />
          <SummaryCard
            label="Pending"
            value={formatPrice(summary.pendingAmount, cur)}
            icon={Clock}
            color="text-[var(--accent)]"
            bg="bg-[var(--accent)]"
            highlight={summary.pendingAmount > 0}
          />
          <SummaryCard
            label="Discounts"
            value={formatPrice(summary.totalDiscount, cur)}
            icon={Tag}
            color="text-[var(--accent-text)]"
            bg="bg-[var(--accent-muted)]"
          />
        </div>
      )}

      {summary && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-[var(--text-2)]">
            <span className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              {summary.totalOrders} orders today
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[var(--accent-hover)]" />
              {summary.paidOrders} paid
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-[var(--accent)]" />
              {summary.unpaidOrders} unpaid
            </span>
            {summary.digitalRevenue > 0 && (
              <span className="flex items-center gap-1">
                <Wallet className="h-3 w-3 text-purple-500" />
                {formatPrice(summary.digitalRevenue, cur)} digital
              </span>
            )}
          </div>
          <button
            onClick={async () => {
              try {
                const today = new Date().toISOString().split("T")[0];
                const data = await apiFetch<{
                  date: string;
                  summary: { totalOrders: number; paidOrders: number; unpaidOrders: number; totalRevenue: number };
                  byMethod: Record<string, unknown>;
                  discrepancies: unknown[];
                }>(
                  `/api/restaurants/${restaurantId}/billing/reconciliation?date=${today}`,
                  { cacheTtl: 0 },
                );
                const lines = [
                  `Reconciliation Report — ${data.date}`,
                  `Total: ${data.summary.totalOrders} orders | Paid: ${data.summary.paidOrders} | Unpaid: ${data.summary.unpaidOrders}`,
                  `Revenue: ${formatPrice(data.summary.totalRevenue, cur)}`,
                  "",
                  "By Method:",
                  ...Object.entries(data.byMethod as Record<string, { total: number; paid: number; pending: number; failed: number; expired: number; awaitingVerification: number; revenue: number }>)
                    .filter(([, v]) => v.total > 0)
                    .map(([m, v]) => `  ${m}: ${v.total} orders (${v.paid} paid, ${v.pending} pending, ${v.failed} failed${v.awaitingVerification > 0 ? `, ${v.awaitingVerification} verifying` : ""}${v.expired > 0 ? `, ${v.expired} expired` : ""}) — ${formatPrice(v.revenue, cur)}`),
                ];
                if ((data.discrepancies as unknown[]).length > 0) {
                  lines.push("", "Discrepancies (delivered but unpaid):");
                  for (const d of data.discrepancies as { orderNo: string; paymentMethod: string; paymentStatus: string }[]) {
                    lines.push(`  Order #${d.orderNo} — ${d.paymentMethod} ${d.paymentStatus}`);
                  }
                }
                showToast(lines.join("\n"), "info");
              } catch {
                showToast("Failed to load reconciliation report", "error");
              }
            }}
            className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
          >
            <TrendingUp className="h-3 w-3" />
            Reconciliation
          </button>
        </div>
      )}

      <div className="flex rounded-full bg-[var(--surface)] p-1.5 gap-1 border border-[var(--border)] shadow-sm">
        {[
          {
            key: "all" as PayType,
            label: "All Orders",
            icon: Receipt,
            count: orders.length,
          },
          {
            key: "cash" as PayType,
            label: "Cash Bills",
            icon: BillIcon,
            count: cashCount,
          },
          {
            key: "online" as PayType,
            label: "Online Receipts",
            icon: ScanLine,
            count: onlineCount,
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = payType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setPayType(t.key)}
              className={`relative flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-colors duration-300 ${
                isActive
                  ? "text-white"
                  : "text-[var(--text-2)] hover:text-[var(--text-1)]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="billing-segmented-tab"
                  className="absolute inset-0 rounded-full bg-[var(--accent)] shadow-md shadow-[var(--accent)]/30 border border-white/10 dark:border-white/5"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <Icon
                className={`relative z-10 h-4 w-4 ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}
              />
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
              <span className="relative z-10 sm:hidden">
                {t.key === "all" ? "All" : t.key === "cash" ? "Cash" : "Online"}
              </span>
              {t.count > 0 && (
                <span
                  className={`relative z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--border)] text-[var(--text-2)]"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {payType === "cash" && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-2.5">
          <BillIcon className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
          <p className="text-xs text-[var(--accent-text)] font-medium">
            <span className="font-bold">Cash Bills</span>: Customer pays at the
            counter. Collect cash and mark as paid.
          </p>
        </div>
      )}
      {payType === "online" && (
        <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5">
          <ScanLine className="h-4 w-4 text-purple-600 shrink-0" />
          <p className="text-xs text-purple-700 font-medium">
            <span className="font-bold">Online Receipts</span>: Payment
            collected via eSewa / Khalti / Bank. View or print the receipt.
          </p>
        </div>
      )}

      {/* Main tabs: Orders vs Staff Report */}
      <div className="flex gap-2 border-b border-[var(--border-soft)] pb-0">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px ${
            activeTab === "orders"
              ? "border-[#3e1e0c] text-[var(--text-1)]"
              : "border-transparent text-[var(--text-2)] hover:text-[var(--text-2)]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Orders
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("staff-report");
            loadStaffReport(staffReportDate);
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px ${
            activeTab === "staff-report"
              ? "border-[#3e1e0c] text-[var(--text-1)]"
              : "border-transparent text-[var(--text-2)] hover:text-[var(--text-2)]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            Staff Report
          </div>
        </button>
      </div>

      {/* Staff Report Panel */}
      {activeTab === "staff-report" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={staffReportDate}
              onChange={(e) => {
                setStaffReportDate(e.target.value);
                loadStaffReport(e.target.value);
              }}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-2)] outline-none focus:border-[#3e1e0c] focus:ring-1 focus:ring-[var(--text-1)]/20"
            />
            <button
              onClick={() => loadStaffReport(staffReportDate)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text-1)] px-4 py-2 text-xs font-bold text-white hover:bg-[#5a2d12] transition-colors"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {staffReport ? (
            <div className="space-y-4">
              {/* Grand total */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-4">
                  <p className="text-xs text-[var(--accent-text)] font-semibold">Total Collected</p>
                  <p className="text-2xl font-black text-[var(--accent-text)] mt-1">
                    {formatPrice(staffReport.grandTotal, cur)}
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs text-blue-600 font-semibold">Orders Processed</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    {staffReport.grandOrderCount}
                  </p>
                </div>
              </div>

              {/* Per-staff breakdown */}
              {staffReport.staff.map((s) => (
                <div key={s.staffId} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm space-y-3">
                  {/* Staff header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[var(--text-1)] flex items-center justify-center text-white text-xs font-bold">
                          {s.staffName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-1)]">{s.staffName}</p>
                          <p className="text-[10px] text-[var(--text-2)]">{s.staffEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[9px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                          {s.role}
                        </span>
                        <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent-text)] uppercase tracking-wide">
                          {s.staffType.replace("_", " ")}
                        </span>
                        {s.shift && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                            Shift: {s.shift.startTime}–{s.shift.endTime}
                            {s.shift.label ? ` (${s.shift.label})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[var(--accent-text)]">
                        {formatPrice(s.totalCollected, cur)}
                      </p>
                      <p className="text-[10px] text-[var(--text-2)]">{s.orderCount} orders</p>
                    </div>
                  </div>

                  {/* Method breakdown */}
                  {s.orderCount > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(s.byMethod)
                        .filter(([, v]) => v.count > 0)
                        .map(([method, v]) => (
                          <div key={method} className="rounded-xl bg-[var(--canvas-sub)] px-3 py-2 text-center">
                            <p className="text-[9px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                              {paymentMethodLabel(method)}
                            </p>
                            <p className="text-sm font-black text-[var(--text-1)] mt-0.5">
                              {formatPrice(v.amount, cur)}
                            </p>
                            <p className="text-[9px] text-[var(--text-3)]">{v.count} orders</p>
                          </div>
                        ))}
                    </div>
                  )}

                  {s.orderCount === 0 && (
                    <p className="text-xs text-[var(--text-3)] text-center py-2">
                      No payments collected today
                    </p>
                  )}
                </div>
              ))}

              {staffReport.staff.length === 0 && (
                <div className="text-center py-8 text-[var(--text-3)]">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No staff data for this date</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-3)]">
              <p className="text-sm">Select a date to view the staff report</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
      <>{/* Filter + Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex bg-[var(--surface)] p-1 rounded-full border border-[var(--border)] w-full lg:w-auto shadow-sm">
          {[
            { key: "unpaid", label: "Unpaid", count: summary?.unpaidOrders },
            { key: "paid", label: "Paid", count: summary?.paidOrders },
            { key: "today", label: "All Today" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative flex-1 lg:flex-none flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition-colors duration-300 ${
                filter === f.key
                  ? "text-white"
                  : "text-[var(--text-2)] hover:text-[var(--text-1)]"
              }`}
            >
              {filter === f.key && (
                <motion.div
                  layoutId="billing-filter-pill"
                  className="absolute inset-0 rounded-full bg-[var(--text-1)] shadow-md border border-white/5"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <Filter className={`relative z-10 h-3.5 w-3.5 ${filter === f.key ? 'opacity-100' : 'opacity-70'}`} />
              <span className="relative z-10">{f.label}</span>
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`relative z-10 ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1.5 text-[9px] font-black ${
                    filter === f.key
                      ? "bg-white/20 text-white"
                      : "bg-[var(--border)] text-[var(--text-2)]"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, table..."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] focus:bg-[var(--canvas)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all shadow-sm"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--text-3)]">
          <Receipt className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-bold">No orders found</p>
          <p className="text-xs mt-1">
            {filter === "unpaid"
              ? "All orders have been paid!"
              : "No matching orders"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-3xl backdrop-blur-md p-5 border transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${
              isPaid(order)
                ? "bg-[var(--canvas)]/80 border-[var(--border-soft)]/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
                : "bg-[var(--accent)]0/50 border-[var(--accent-border)]0/50 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.05)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-[var(--text-1)]">
                  #{order.orderNo}
                </span>
                {order.tableNo && (
                  <span className="rounded-lg bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                    <Utensils className="inline h-2.5 w-2.5 mr-0.5" />
                    Table {order.tableNo}
                  </span>
                )}
                {order.roomNo && (
                  <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                    <BedDouble className="inline h-2.5 w-2.5 mr-0.5" />
                    Room {order.roomNo}
                  </span>
                )}
                {order.type === "DELIVERY" && (
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    <Truck className="inline h-2.5 w-2.5 mr-0.5" />
                    Delivery
                  </span>
                )}
                {order.type === "TAKEAWAY" && (
                  <span className="rounded-lg bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                    <ShoppingCart className="inline h-2.5 w-2.5 mr-0.5" />
                    Takeaway
                  </span>
                )}
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-[var(--surface)]"}`}
                >
                  {order.status}
                </span>
                {order.payment ? (
                  order.payment.method === "CASH" ? (
                    <span className="flex items-center gap-0.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                      <BillIcon className="h-2.5 w-2.5" />
                      Cash Bill
                    </span>
                  ) : order.payment.method === "DIRECT" ? (
                    <span className={`flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                      order.payment.status === "COMPLETED"
                        ? "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[var(--accent-text)]"
                        : "bg-[var(--accent)] border-[var(--accent-border)] text-[var(--accent)]"
                    }`}>
                      <Receipt className="h-2.5 w-2.5" />
                      Fast Pay &middot; {order.payment.status === "COMPLETED" ? "Paid" : "Unpaid"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 rounded-lg bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      <ScanLine className="h-2.5 w-2.5" />
                      {paymentMethodLabel(order.payment.method)} Receipt
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-0.5 rounded-lg bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                    <BillIcon className="h-2.5 w-2.5" />
                    Bill
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isPaid(order) ? (
                  <span className="flex items-center gap-1 rounded-lg bg-[var(--accent-muted)] px-2 py-1 text-[10px] font-bold text-[var(--accent-text)]">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-[var(--accent)]">
                    <Clock className="h-3 w-3" />
                    UNPAID
                  </span>
                )}
              </div>
            </div>
            {order.payment &&
              order.payment.method !== "CASH" &&
              order.payment.transactionId && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2">
                  <ScanLine className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                    Txn ID:
                  </span>
                  <span className="text-[11px] font-mono text-purple-700 select-all truncate">
                    {order.payment.transactionId}
                  </span>
                </div>
              )}

            <div className="space-y-1 mb-3">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-bold text-[var(--text-2)]">
                    {formatPrice(item.price * item.quantity, cur)}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-[10px] text-[var(--text-3)]">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>

            <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-2)]">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(order.bill?.subtotal ?? order.subtotal, cur)}
                </span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span className="font-medium">
                    {formatPrice(order.bill?.tax ?? order.tax, cur)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.serviceCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">
                    Service Charge ({scRate}%)
                  </span>
                  <span className="font-medium">
                    {formatPrice(order.bill.serviceCharge, cur)}
                  </span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Delivery Fee</span>
                  <span className="font-medium">
                    {formatPrice(order.deliveryFee, cur)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--accent-text)]">Discount</span>
                  <span className="font-medium text-[var(--accent-text)]">
                    -{formatPrice(order.bill.discount, cur)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-[var(--border)] pt-1.5 mt-1.5">
                <span className="text-[var(--text-1)]">Total</span>
                <span className="text-[var(--text-1)]">
                  {formatPrice(order.bill?.total ?? order.total, cur)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-3)]">
                <Clock className="h-3 w-3" />
                {timeAgo(order.createdAt)}
                {order.user?.name && (
                  <span className="flex items-center gap-0.5">
                    <UserIcon className="h-2.5 w-2.5" />
                    {order.user.name}
                  </span>
                )}
                {order.payment && (
                  <span className="flex items-center gap-0.5">
                    <CreditCard className="h-2.5 w-2.5" />
                    {paymentMethodLabel(order.payment.method)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Print Bill — merged action. One click opens the print dialog
                    with the thermal receipt; it never opens a separate tab. */}
                <button
                  onClick={() => printBillForOrder(order.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    order.payment && order.payment.method !== "CASH"
                      ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                  }`}
                  title="Print bill"
                >
                  <Printer className="h-3 w-3" />
                  {order.payment && order.payment.method !== "CASH"
                    ? "Receipt"
                    : "Bill"}
                </button>

                {/* Discount button — only for Manager/SuperAdmin */}
                {canDiscount && !isPaid(order) && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDiscount(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[var(--accent-muted)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all"
                  >
                    <Tag className="h-3 w-3" />
                    Discount
                  </button>
                )}

                {/* Payment Verification — for orders with proof uploaded or awaiting verification */}
                {order.payment &&
                  order.payment.status === "AWAITING_VERIFICATION" && (
                    <div className="flex items-center gap-1">
                      {order.payment.proofUrl && (
                        <button
                          onClick={() => setProofPreviewUrl(order.payment!.proofUrl!)}
                          className="flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-600 transition-all shadow-sm"
                        >
                          <Eye className="h-3 w-3" />
                          View Proof
                        </button>
                      )}
                      <button
                        onClick={() => handleVerifyBank(order, "VERIFY")}
                        disabled={actionLoading}
                        className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[var(--accent-hover)] disabled:bg-[var(--border)] transition-all shadow-sm"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Verify
                      </button>
                      <button
                        onClick={() => handleVerifyBank(order, "REJECT")}
                        disabled={actionLoading}
                        className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 disabled:bg-[var(--surface-alt)] transition-all"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  )}

                {/* Mark Paid — for ALL unpaid non-cancelled orders (except those awaiting verification, handled above) */}
                {!isPaid(order) &&
                  order.status !== "CANCELLED" &&
                  order.status !== "REJECTED" &&
                  order.payment?.status !== "AWAITING_VERIFICATION" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setCollectMethod(order.payment?.method || "CASH");
                          setShowCollect(true);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm"
                      >
                        <CreditCard className="h-3 w-3" />
                        Mark Paid
                      </button>
                      {canDiscount && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            const billTotal = order.bill?.total ?? order.total;
                            setSplitEntries([
                              { method: "CASH", amount: (Math.round(billTotal / 2)).toString() },
                              { method: "ESEWA", amount: (billTotal - Math.round(billTotal / 2)).toString() },
                            ]);
                            setShowSplit(true);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                        >
                          <Wallet className="h-3 w-3" />
                          Split
                        </button>
                      )}
                    </>
                  )}

                {/* Clear Table — for dine-in orders that are paid or delivered */}
                {order.tableNo &&
                  (isPaid(order) ||
                    order.status === "DELIVERED" ||
                    order.status === "CANCELLED" ||
                    order.status === "REJECTED") && (
                    <button
                      onClick={() => handleClearTable(order)}
                      disabled={clearingOrderId === order.id}
                      title="Clear table session so next customer starts fresh"
                      className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      {clearingOrderId === order.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Clear Table
                    </button>
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </>
      )}

      <AnimatePresence>
        {showCollect && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-1)]">
                    Collect Payment
                  </h2>
                  <p className="text-xs text-[var(--text-3)]">
                    Order #{selectedOrder.orderNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCollect(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--canvas-sub)] p-4 mb-5 text-center">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">
                  Amount Due
                </p>
                <p className="text-3xl font-extrabold text-[var(--text-1)]">
                  {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, cur)}
                </p>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <p className="text-xs text-[var(--accent-text)] mt-1">
                      Discount applied: {formatPrice(selectedOrder.bill.discount, cur)}
                    </p>
                  )}
              </div>

              <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-1 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Subtotal</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.subtotal ?? selectedOrder.subtotal, cur)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.tax ?? selectedOrder.tax, cur)}
                  </span>
                </div>
                {selectedOrder.bill && selectedOrder.bill.serviceCharge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">
                      Service Charge ({scRate}%)
                    </span>
                    <span>
                      {formatPrice(selectedOrder.bill.serviceCharge, cur)}
                    </span>
                  </div>
                )}
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">Delivery Fee</span>
                    <span>{formatPrice(selectedOrder.deliveryFee, cur)}</span>
                  </div>
                )}
                {selectedOrder.bill && selectedOrder.bill.discount > 0 && (
                  <div className="flex justify-between text-xs text-[var(--accent-text)]">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedOrder.bill.discount, cur)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["CASH", "COUNTER", "DIRECT", "ESEWA", "KHALTI", "BANK"] as const).map(
                    (method) => {
                      const Icon = paymentMethodIcon(method);
                      const isSelected = collectMethod === method;
                      return (
                        <button
                          key={method}
                          onClick={() => setCollectMethod(method)}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent-muted)] shadow-sm"
                              : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--border)]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`}
                          />
                          <div>
                            <span
                              className={`text-xs font-bold block ${isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}
                            >
                              {paymentMethodLabel(method)}
                            </span>
                            {paymentMethodDesc(method) && (
                              <span className="text-[10px] text-[var(--text-3)] leading-tight block">
                                {paymentMethodDesc(method)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Transaction ID for non-cash online methods */}
              {collectMethod !== "CASH" && collectMethod !== "COUNTER" && collectMethod !== "DIRECT" && (
                <div className="mb-5">
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                    Transaction / Reference ID
                  </label>
                  <input
                    value={collectTxn}
                    onChange={(e) => setCollectTxn(e.target.value)}
                    placeholder="Enter transaction ID..."
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)] transition-all"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCollect(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectPayment}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:bg-[var(--border)] transition-all shadow-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {actionLoading ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiscount && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-1)]">
                    Apply Discount
                  </h2>
                  <p className="text-xs text-[var(--text-3)]">
                    Order #{selectedOrder.orderNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDiscount(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--canvas-sub)] p-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">Current Bill Total</span>
                  <span className="font-bold text-[var(--text-1)]">
                    {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, cur)}
                  </span>
                </div>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[var(--accent-text)]">Existing Discount</span>
                      <span className="font-bold text-[var(--accent-text)]">
                        {formatPrice(selectedOrder.bill.discount, cur)}
                      </span>
                    </div>
                  )}
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                    Discount Amount ({getCurrencySymbol(cur)})
                  </label>
                  <input
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="e.g., 100"
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                    Reason (optional)
                  </label>
                  <input
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g., Regular customer, promo code..."
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDiscountAmount(amt.toString())}
                      className="rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-bold text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all"
                    >
                      {formatPrice(amt, cur)}
                    </button>
                  ))}
                  {[5, 10, 15, 20].map((pct) => {
                    const base =
                      selectedOrder.bill?.subtotal ?? selectedOrder.subtotal;
                    const amt = Math.round((base * pct) / 100);
                    return (
                      <button
                        key={`pct-${pct}`}
                        onClick={() => setDiscountAmount(amt.toString())}
                        className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all"
                      >
                        {pct}% ({formatPrice(amt, cur)})
                      </button>
                    );
                  })}
                </div>
              </div>

              {discountAmount && parseFloat(discountAmount) > 0 && (
                <div className="rounded-xl bg-[var(--accent-muted)] p-3 mb-5 border border-[var(--accent-border)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--accent-text)] font-medium">
                      New Total after Discount
                    </span>
                    <span className="font-extrabold text-[var(--text-1)]">
                      {formatPrice(Math.max(
                        0,
                        (selectedOrder.bill?.subtotal ?? selectedOrder.subtotal) +
                          (selectedOrder.bill?.tax ?? selectedOrder.tax) +
                          (selectedOrder.bill?.serviceCharge ?? 0) +
                          (selectedOrder.deliveryFee ?? 0) -
                          parseFloat(discountAmount),
                      ), cur)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDiscount(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyDiscount}
                  disabled={
                    actionLoading ||
                    !discountAmount ||
                    parseFloat(discountAmount) <= 0
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:bg-[var(--border)] transition-all shadow-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4" />
                  )}
                  {actionLoading ? "Applying..." : "Apply Discount"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Split Payment Modal */}
      <AnimatePresence>
        {showSplit && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-1)]">Split Payment</h2>
                  <p className="text-xs text-[var(--text-3)]">Order #{selectedOrder.orderNo}</p>
                </div>
                <button
                  onClick={() => { setShowSplit(false); setSelectedOrder(null); }}
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--canvas-sub)] p-3 mb-4 flex justify-between text-sm">
                <span className="text-[var(--text-2)] font-medium">Bill Total</span>
                <span className="font-extrabold text-[var(--text-1)]">
                  {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, cur)}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Payment Splits
                </p>
                {splitEntries.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={entry.method}
                      onChange={(e) => {
                        const updated = [...splitEntries];
                        updated[i] = { ...updated[i], method: e.target.value };
                        setSplitEntries(updated);
                      }}
                      className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-bold text-[var(--text-1)] outline-none focus:border-indigo-400 transition-all"
                    >
                      {(["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"] as const).map((m) => (
                        <option key={m} value={m}>{paymentMethodLabel(m)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={entry.amount}
                      onChange={(e) => {
                        const updated = [...splitEntries];
                        updated[i] = { ...updated[i], amount: e.target.value };
                        setSplitEntries(updated);
                      }}
                      placeholder="Amount"
                      className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                    {splitEntries.length > 2 && (
                      <button
                        onClick={() => setSplitEntries(splitEntries.filter((_, idx) => idx !== i))}
                        className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {splitEntries.length < 4 && (
                  <button
                    onClick={() => setSplitEntries([...splitEntries, { method: "BANK", amount: "" }])}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    + Add another method
                  </button>
                )}
              </div>

              {/* Running total */}
              {(() => {
                const billTotal = selectedOrder.bill?.total ?? selectedOrder.total;
                const entered = splitEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                const remaining = billTotal - entered;
                return (
                  <div className={`rounded-xl p-3 mb-5 border text-sm flex justify-between ${
                    Math.abs(remaining) <= 1 ? "bg-[var(--accent-muted)] border-[var(--accent-border)]" : "bg-indigo-50 border-indigo-100"
                  }`}>
                    <span className={Math.abs(remaining) <= 1 ? "text-[var(--accent-text)] font-medium" : "text-indigo-700 font-medium"}>
                      {Math.abs(remaining) <= 1 ? <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Amounts balanced</span> : `Remaining: ${formatPrice(Math.abs(remaining), cur)} ${remaining > 0 ? "unallocated" : "over"}`}
                    </span>
                    <span className="font-extrabold text-[var(--text-1)]">{formatPrice(entered, cur)}</span>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowSplit(false); setSelectedOrder(null); }}
                  className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitPayment}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white hover:bg-indigo-600 disabled:bg-[var(--border)] transition-all shadow-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {actionLoading ? "Processing..." : "Confirm Split"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Summary Card Sub-component */

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
  bg: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-md ${
        highlight
          ? "border-[var(--accent-border)] bg-[var(--accent)]0/40 shadow-sm"
          : "border-[var(--border-soft)]/50 bg-[var(--canvas)]/70 backdrop-blur-md shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wider block mb-1">
            {label}
          </span>
          <p className="text-xl font-black text-[var(--text-1)] tracking-tight">{value}</p>
          {sub && <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>}
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm border border-black/5 ${bg}`}
        >
          <Icon className={`h-4.5 w-4.5 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Billing page = live-orders billing + Fast/Manual pay, merged into one place
 * with a simple sub-tab switch (Restrox-style).
 */
export default function BillingTab(props: BillingTabProps) {
  const { selectedRestaurant } = useRestaurant();
  const [view, setView] = useState<"normal" | "fast">("normal");
  const r = selectedRestaurant;

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-2xl bg-[var(--canvas-sub)] p-1 ring-1 ring-[var(--border)]">
        {([
          { id: "normal", label: "Normal Billing", icon: Receipt },
          { id: "fast", label: "Fast Pay & Manual Pay", icon: Zap },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
              view === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            <Icon className={`h-4 w-4 ${view === id ? "text-[var(--accent)]" : ""}`} />
            {label}
          </button>
        ))}
      </div>

      {view === "normal" ? (
        <LiveBilling {...props} />
      ) : (
        <ManualBillingTab
          restaurantId={props.restaurantId}
          currency={r?.currency ?? props.currency ?? "NPR"}
          restaurantName={r?.name ?? ""}
          restaurantAddress={r?.address ?? ""}
          restaurantPhone={r?.phone ?? ""}
          taxRate={r?.taxRate ?? 13}
          taxEnabled={r?.taxEnabled ?? true}
          counterWidth={r?.printCounterWidth ?? 80}
          kitchenWidth={r?.printKitchenWidth ?? 80}
          printAutoReceipt={r?.printAutoReceipt ?? false}
        />
      )}
    </div>
  );
}
