"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";

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
  onlineRevenue: number;
  pendingAmount: number;
  totalDiscount: number;
}

interface BillingTabProps {
  restaurantId: string;
  staffRole?: string;
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
  };
  return map[method] || method;
}

function paymentMethodIcon(method: string) {
  switch (method) {
    case "ESEWA":
    case "KHALTI":
      return Wallet;
    case "BANK":
      return Banknote;
    case "CASH":
    default:
      return DollarSign;
  }
}

async function staffFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-600",
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

export default function BillingTab({
  restaurantId,
  staffRole,
}: BillingTabProps) {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [actionLoading, setActionLoading] = useState(false);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Tax & service charge config
  const [taxRate, setTaxRate] = useState(13);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [scRate, setScRate] = useState(10);
  const [scEnabled, setScEnabled] = useState(true);

  const canDiscount =
    staffRole === "MANAGER" || staffRole === "SUPER_ADMIN" || !staffRole;

  const loadOrders = useCallback(async () => {
    try {
      const data = await staffFetch(
        `/api/restaurants/${restaurantId}/billing?filter=${filter}`,
      );
      const fetched: BillOrder[] = data.orders || [];

      if (!isFirstLoad.current) {
        const newOnes = fetched.filter((o) => !knownOrderIds.current.has(o.id));
        if (newOnes.length > 0) playBillingAlert();
      }

      knownOrderIds.current = new Set(fetched.map((o) => o.id));
      isFirstLoad.current = false;
      setOrders(fetched);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [restaurantId, filter]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await staffFetch(
        `/api/restaurants/${restaurantId}/billing/summary`,
      );
      setSummary(data);
    } catch {
      /* ignore */
    }
  }, [restaurantId]);

  useEffect(() => {
    isFirstLoad.current = true;
    knownOrderIds.current = new Set();
    loadOrders();
    loadSummary();
    // Fetch tax config
    staffFetch(`/api/restaurants/${restaurantId}/tax-config`)
      .then(
        (cfg: {
          taxRate: number;
          taxEnabled: boolean;
          serviceChargeRate: number;
          serviceChargeEnabled: boolean;
        }) => {
          setTaxRate(cfg.taxRate);
          setTaxEnabled(cfg.taxEnabled);
          setScRate(cfg.serviceChargeRate);
          setScEnabled(cfg.serviceChargeEnabled);
        },
      )
      .catch(() => {});
    const iv = setInterval(() => {
      loadOrders();
      loadSummary();
    }, 8000);
    return () => clearInterval(iv);
  }, [loadOrders, loadSummary]);

  const handleCollectPayment = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/billing/collect`, {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedOrder.id,
          method: collectMethod,
          transactionId: collectTxn || undefined,
        }),
      });
      setShowCollect(false);
      setCollectTxn("");
      setSelectedOrder(null);
      loadOrders();
      loadSummary();
    } catch {
      /* ignore */
    }
    setActionLoading(false);
  };

  const handleApplyDiscount = async () => {
    if (!selectedOrder) return;
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) return;
    setActionLoading(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/billing/discount`, {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount,
          reason: discountReason || undefined,
        }),
      });
      setShowDiscount(false);
      setDiscountAmount("");
      setDiscountReason("");
      setSelectedOrder(null);
      loadOrders();
      loadSummary();
    } catch {
      /* ignore */
    }
    setActionLoading(false);
  };

  const isCashOrder = (o: BillOrder) =>
    !o.payment || o.payment.method === "CASH";
  const isOnlineOrder = (o: BillOrder) =>
    o.payment && o.payment.method !== "CASH";
  const isPaid = (o: BillOrder) => o.payment?.status === "COMPLETED";

  const filtered = orders.filter((o) => {
    // Pay type filter
    if (payType === "cash" && !isCashOrder(o)) return false;
    if (payType === "online" && !isOnlineOrder(o)) return false;
    // Text search
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#E23744]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Daily Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Revenue"
            value={formatPrice(summary.totalRevenue, cur)}
            icon={TrendingUp}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <SummaryCard
            label="Cash Collected"
            value={formatPrice(summary.cashRevenue, cur)}
            icon={DollarSign}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <SummaryCard
            label="Pending"
            value={formatPrice(summary.pendingAmount, cur)}
            icon={Clock}
            color="text-orange-600"
            bg="bg-orange-50"
            highlight={summary.pendingAmount > 0}
          />
          <SummaryCard
            label="Discounts"
            value={formatPrice(summary.totalDiscount, cur)}
            icon={Tag}
            color="text-pink-600"
            bg="bg-pink-50"
          />
        </div>
      )}

      {/* Stats Row */}
      {summary && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {summary.totalOrders} orders today
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {summary.paidOrders} paid
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-orange-500" />
            {summary.unpaidOrders} unpaid
          </span>
          {summary.onlineRevenue > 0 && (
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3 text-purple-500" />
              {formatPrice(summary.onlineRevenue, cur)} online
            </span>
          )}
        </div>
      )}

      {/* Cash vs Online Split Tabs */}
      <div className="flex rounded-2xl bg-gray-100/80 p-1 gap-1">
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
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? t.key === "cash"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : t.key === "online"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "bg-white text-[#1F2A2A] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isActive
                    ? t.key === "cash"
                      ? "text-emerald-500"
                      : t.key === "online"
                        ? "text-purple-500"
                        : "text-[#1F2A2A]"
                    : "text-gray-400"
                }`}
              />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">
                {t.key === "all" ? "All" : t.key === "cash" ? "Cash" : "Online"}
              </span>
              {t.count > 0 && (
                <span
                  className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    isActive
                      ? t.key === "cash"
                        ? "bg-emerald-100 text-emerald-700"
                        : t.key === "online"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Context hint for selected tab */}
      {payType === "cash" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
          <BillIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            <span className="font-bold">Cash Bills</span> — Customer pays at the
            counter. Collect cash and mark as paid.
          </p>
        </div>
      )}
      {payType === "online" && (
        <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5">
          <ScanLine className="h-4 w-4 text-purple-600 shrink-0" />
          <p className="text-xs text-purple-700 font-medium">
            <span className="font-bold">Online Receipts</span> — Payment
            collected via eSewa / Khalti / Bank. View or print the receipt.
          </p>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "unpaid", label: "Unpaid", count: summary?.unpaidOrders },
            { key: "paid", label: "Paid", count: summary?.paidOrders },
            { key: "today", label: "All Today" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setLoading(true);
              }}
              className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                filter === f.key
                  ? "bg-[#1F2A2A] text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-3 w-3" />
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    filter === f.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, table..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10 transition-all"
          />
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Receipt className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-bold">No orders found</p>
          <p className="text-xs mt-1">
            {filter === "unpaid"
              ? "All orders have been paid!"
              : "No matching orders"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl bg-white border p-4 shadow-sm hover:shadow-md transition-all ${
              isPaid(order)
                ? "border-gray-100"
                : "border-orange-200 bg-orange-50/20"
            }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-[#1F2A2A]">
                  #{order.orderNo}
                </span>
                {order.tableNo && (
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
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
                  <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    <ShoppingCart className="inline h-2.5 w-2.5 mr-0.5" />
                    Takeaway
                  </span>
                )}
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-gray-100"}`}
                >
                  {order.status}
                </span>
                {/* Receipt type pill */}
                {order.payment ? (
                  order.payment.method === "CASH" ? (
                    <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <BillIcon className="h-2.5 w-2.5" />
                      Cash Bill
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 rounded-lg bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      <ScanLine className="h-2.5 w-2.5" />
                      {paymentMethodLabel(order.payment.method)} Receipt
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-0.5 rounded-lg bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    <BillIcon className="h-2.5 w-2.5" />
                    Bill
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isPaid(order) ? (
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                    <Clock className="h-3 w-3" />
                    UNPAID
                  </span>
                )}
              </div>
            </div>
            {/* Online transaction ID */}
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

            {/* Items summary */}
            <div className="space-y-1 mb-3">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-bold text-gray-500">
                    {formatPrice(item.price * item.quantity, cur)}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-[10px] text-gray-400">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>

            {/* Bill breakdown */}
            <div className="rounded-xl bg-gray-50 p-3 space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(order.bill?.subtotal ?? order.subtotal, cur)}
                </span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium">
                    {formatPrice(order.bill?.tax ?? order.tax, cur)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.serviceCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    Service Charge ({scRate}%)
                  </span>
                  <span className="font-medium">
                    {formatPrice(order.bill.serviceCharge, cur)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-pink-600">Discount</span>
                  <span className="font-medium text-pink-600">
                    -{formatPrice(order.bill.discount, cur)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-gray-200 pt-1.5 mt-1.5">
                <span className="text-[#1F2A2A]">Total</span>
                <span className="text-[#1F2A2A]">
                  {formatPrice(order.bill?.total ?? order.total, cur)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
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
                {/* View Bill / Receipt */}
                <a
                  href={`/bill/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    order.payment && order.payment.method !== "CASH"
                      ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <ExternalLink className="h-3 w-3" />
                  {order.payment && order.payment.method !== "CASH"
                    ? "Receipt"
                    : "Bill"}
                </a>

                {/* Print */}
                <a
                  href={`/bill/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-all"
                  title="Print"
                >
                  <Printer className="h-3 w-3" />
                </a>

                {/* Discount button — only for Manager/SuperAdmin */}
                {canDiscount && !isPaid(order) && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDiscount(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-pink-50 px-2.5 py-1.5 text-[10px] font-bold text-pink-700 hover:bg-pink-100 transition-all"
                  >
                    <Tag className="h-3 w-3" />
                    Discount
                  </button>
                )}

                {/* Mark Paid — for ALL unpaid non-cancelled orders */}
                {!isPaid(order) &&
                  order.status !== "CANCELLED" &&
                  order.status !== "REJECTED" && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setCollectMethod(order.payment?.method || "CASH");
                        setShowCollect(true);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-600 transition-all shadow-sm"
                    >
                      <CreditCard className="h-3 w-3" />
                      Mark Paid
                    </button>
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Collect Payment Modal */}
      <AnimatePresence>
        {showCollect && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1F2A2A]">
                    Collect Payment
                  </h2>
                  <p className="text-xs text-gray-400">
                    Order #{selectedOrder.orderNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCollect(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Amount */}
              <div className="rounded-2xl bg-gray-50 p-4 mb-5 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Amount Due
                </p>
                <p className="text-3xl font-extrabold text-[#1F2A2A]">
                  {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, cur)}
                </p>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <p className="text-xs text-pink-600 mt-1">
                      Discount applied: {formatPrice(selectedOrder.bill.discount, cur)}
                    </p>
                  )}
              </div>

              {/* Bill Breakdown */}
              <div className="rounded-xl bg-gray-50 p-3 space-y-1 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.subtotal ?? selectedOrder.subtotal, cur)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.tax ?? selectedOrder.tax, cur)}
                  </span>
                </div>
                {selectedOrder.bill && selectedOrder.bill.serviceCharge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      Service Charge ({scRate}%)
                    </span>
                    <span>
                      {formatPrice(selectedOrder.bill.serviceCharge, cur)}
                    </span>
                  </div>
                )}
                {selectedOrder.bill && selectedOrder.bill.discount > 0 && (
                  <div className="flex justify-between text-xs text-pink-600">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedOrder.bill.discount, cur)}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2 mb-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["CASH", "ESEWA", "KHALTI", "BANK"] as const).map(
                    (method) => {
                      const Icon = paymentMethodIcon(method);
                      const isSelected = collectMethod === method;
                      return (
                        <button
                          key={method}
                          onClick={() => setCollectMethod(method)}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-50 shadow-sm"
                              : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-gray-400"}`}
                          />
                          <span
                            className={`text-xs font-bold ${isSelected ? "text-emerald-700" : "text-gray-600"}`}
                          >
                            {paymentMethodLabel(method)}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Transaction ID for non-cash */}
              {collectMethod !== "CASH" && (
                <div className="mb-5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Transaction / Reference ID
                  </label>
                  <input
                    value={collectTxn}
                    onChange={(e) => setCollectTxn(e.target.value)}
                    placeholder="Enter transaction ID..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCollect(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectPayment}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:bg-gray-300 transition-all shadow-sm"
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

      {/* Apply Discount Modal */}
      <AnimatePresence>
        {showDiscount && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1F2A2A]">
                    Apply Discount
                  </h2>
                  <p className="text-xs text-gray-400">
                    Order #{selectedOrder.orderNo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDiscount(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Current total */}
              <div className="rounded-2xl bg-gray-50 p-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current Bill Total</span>
                  <span className="font-bold text-[#1F2A2A]">
                    {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, cur)}
                  </span>
                </div>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-pink-600">Existing Discount</span>
                      <span className="font-bold text-pink-600">
                        {formatPrice(selectedOrder.bill.discount, cur)}
                      </span>
                    </div>
                  )}
              </div>

              {/* Discount inputs */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Discount Amount ({getCurrencySymbol(cur)})
                  </label>
                  <input
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="e.g., 100"
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Reason (optional)
                  </label>
                  <input
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g., Regular customer, promo code..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>

                {/* Quick discount buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDiscountAmount(amt.toString())}
                      className="rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-100 transition-all"
                    >
                      {formatPrice(amt, cur)}
                    </button>
                  ))}
                  {/* Percentage buttons */}
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

              {/* Preview */}
              {discountAmount && parseFloat(discountAmount) > 0 && (
                <div className="rounded-xl bg-pink-50 p-3 mb-5 border border-pink-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-600 font-medium">
                      New Total after Discount
                    </span>
                    <span className="font-extrabold text-[#1F2A2A]">
                      {formatPrice(Math.max(
                        0,
                        (selectedOrder.bill?.subtotal ??
                          selectedOrder.subtotal) +
                          (selectedOrder.bill?.tax ?? selectedOrder.tax) +
                          (selectedOrder.bill?.serviceCharge ?? 0) -
                          parseFloat(discountAmount),
                      ), cur)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDiscount(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-pink-500 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:bg-gray-300 transition-all shadow-sm"
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
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all ${
        highlight
          ? "border-orange-200 bg-orange-50/30 shadow-sm"
          : "border-gray-100 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-base font-extrabold text-[#1F2A2A]">{value}</p>
    </div>
  );
}
