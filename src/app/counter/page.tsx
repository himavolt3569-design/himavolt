"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Mountain,
  Loader2,
  Clock,
  Check,
  X,
  Bell,
  Search,
  CreditCard,
  User,
  Volume2,
  VolumeX,
  ChefHat,
  Receipt,
  DollarSign,
  CheckCircle2,
  Timer,
  Tag,
  TrendingUp,
  Printer,
  AlertCircle,
  Wallet,
  Banknote,
  ExternalLink,
  Filter,
  Utensils,
  ScanLine,
  Monitor,
  Settings,
  Package,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import StockTab from "@/components/dashboard/StockTab";
import {
  getFeatureTabsForType,
  type FeatureTabId,
} from "@/lib/restaurant-types";

/* ── Feature tab imports for counter staff ──────────────────────── */
import QuickCounterTab from "@/components/dashboard/features/QuickCounterTab";
import ComboMealsTab from "@/components/dashboard/features/ComboMealsTab";
import RushHourTab from "@/components/dashboard/features/RushHourTab";
import TakeawayTab from "@/components/dashboard/features/TakeawayTab";
import RoomServiceTab from "@/components/dashboard/features/RoomServiceTab";
import MultiOutletTab from "@/components/dashboard/features/MultiOutletTab";
import EventCateringTab from "@/components/dashboard/features/EventCateringTab";
import GuestBillingTab from "@/components/dashboard/features/GuestBillingTab";
import BuffetManagerTab from "@/components/dashboard/features/BuffetManagerTab";
import PreOrdersTab from "@/components/dashboard/features/PreOrdersTab";
import CustomCakesTab from "@/components/dashboard/features/CustomCakesTab";
import DailySpecialsTab from "@/components/dashboard/features/DailySpecialsTab";
import DisplayCounterTab from "@/components/dashboard/features/DisplayCounterTab";
import DeliveryOpsTab from "@/components/dashboard/features/DeliveryOpsTab";
import MultiBrandTab from "@/components/dashboard/features/MultiBrandTab";
import DeliveryZonesTab from "@/components/dashboard/features/DeliveryZonesTab";
import PackageTrackingTab from "@/components/dashboard/features/PackageTrackingTab";
import HappyHoursTab from "@/components/dashboard/features/HappyHoursTab";
import TabManagementTab from "@/components/dashboard/features/TabManagementTab";
import CocktailMenuTab from "@/components/dashboard/features/CocktailMenuTab";
import LiveEventsTab from "@/components/dashboard/features/LiveEventsTab";
import LoyaltyRewardsTab from "@/components/dashboard/features/LoyaltyRewardsTab";
import WifiSeatingTab from "@/components/dashboard/features/WifiSeatingTab";
import SeasonalMenuTab from "@/components/dashboard/features/SeasonalMenuTab";
import BrunchModeTab from "@/components/dashboard/features/BrunchModeTab";
import TableReservationsTab from "@/components/dashboard/features/TableReservationsTab";
import WaitlistTab from "@/components/dashboard/features/WaitlistTab";
import PrivateDiningTab from "@/components/dashboard/features/PrivateDiningTab";

const COUNTER_FEATURE_COMPONENTS: Record<FeatureTabId, React.ComponentType> = {
  "quick-counter": QuickCounterTab,
  "combo-meals": ComboMealsTab,
  "rush-hour": RushHourTab,
  "takeaway": TakeawayTab,
  "room-service": RoomServiceTab,
  "multi-outlet": MultiOutletTab,
  "event-catering": EventCateringTab,
  "guest-billing": GuestBillingTab,
  "buffet-manager": BuffetManagerTab,
  "pre-orders": PreOrdersTab,
  "custom-cakes": CustomCakesTab,
  "daily-specials": DailySpecialsTab,
  "display-counter": DisplayCounterTab,
  "delivery-ops": DeliveryOpsTab,
  "multi-brand": MultiBrandTab,
  "delivery-zones": DeliveryZonesTab,
  "package-tracking": PackageTrackingTab,
  "happy-hours": HappyHoursTab,
  "tab-management": TabManagementTab,
  "cocktail-menu": CocktailMenuTab,
  "live-events": LiveEventsTab,
  "loyalty-rewards": LoyaltyRewardsTab,
  "wifi-seating": WifiSeatingTab,
  "seasonal-menu": SeasonalMenuTab,
  "brunch-mode": BrunchModeTab,
  "table-reservations": TableReservationsTab,
  "waitlist": WaitlistTab,
  "private-dining": PrivateDiningTab,
};

/* ── Types ────────────────────────────────────────────────────────── */

interface StaffSession {
  userId: string;
  staffId: string;
  restaurantId: string;
  role: string;
  name: string;
  restaurantType: string;
  currency: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addOns?: string | null;
}

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
  estimatedTime: number | null;
  createdAt: string;
  deliveredAt: string | null;
  items: OrderItem[];
  user?: { name: string | null; email: string; phone?: string | null } | null;
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
    transactionId: string | null;
    paidAt: string | null;
  } | null;
  bill?: {
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

/* ── SSE Order (lighter shape from the stream) ───────────────────── */
interface SSEOrder {
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
  estimatedTime: number | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  user?: { name: string; email: string } | null;
  payment?: { method: string; status: string } | null;
}

/* ── Constants ────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
};

/* ── Helpers ──────────────────────────────────────────────────────── */

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

function playReadySound() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.2 + 0.5,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.5);
    });
  } catch {
    /* audio not available */
  }
}

function playNewOrderSound() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.15 + 0.4,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } catch {
    /* audio not available */
  }
}

const isPaid = (o: BillOrder) => o.payment?.status === "COMPLETED";

/* ── Token Display Board ─────────────────────────────────────────── */

function TokenBoard({ orders }: { orders: SSEOrder[] }) {
  const readyOrders = orders.filter((o) => o.status === "READY");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");

  return (
    <div className="space-y-4">
      {/* Ready Orders */}
      <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg shadow-emerald-200/50">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-white" />
          <h2 className="text-lg font-extrabold text-white">
            Ready for Pickup
          </h2>
          {readyOrders.length > 0 && (
            <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold text-white">
              {readyOrders.length}
            </span>
          )}
        </div>

        {readyOrders.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-white/40 mb-2" />
            <p className="text-sm text-white/60 font-medium">
              No orders ready right now
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {readyOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative rounded-xl bg-white p-3 text-center shadow-md"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <p className="text-2xl font-black text-emerald-600">
                      #{order.orderNo.split("-").pop()}
                    </p>
                  </motion.div>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">
                    {order.tableNo
                      ? `Table ${order.tableNo}`
                      : order.type === "DELIVERY"
                        ? "Delivery"
                        : order.type === "TAKEAWAY"
                          ? "Takeaway"
                          : "Dine-in"}
                  </p>
                  {order.user?.name && (
                    <p className="text-[10px] text-gray-400 truncate">
                      {order.user.name}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Currently Preparing */}
      <div className="rounded-2xl bg-linear-to-br from-amber-400 to-amber-500 p-5 shadow-lg shadow-amber-200/50">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-5 w-5 text-white" />
          <h2 className="text-lg font-extrabold text-white">Being Prepared</h2>
          {preparingOrders.length > 0 && (
            <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold text-white">
              {preparingOrders.length}
            </span>
          )}
        </div>

        {preparingOrders.length === 0 ? (
          <div className="py-6 text-center">
            <ChefHat className="mx-auto h-8 w-8 text-white/40 mb-2" />
            <p className="text-sm text-white/60 font-medium">
              No orders being prepared
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {preparingOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg bg-white/90 backdrop-blur p-2 text-center"
              >
                <p className="text-lg font-black text-amber-600">
                  #{order.orderNo.split("-").pop()}
                </p>
                {order.estimatedTime && (
                  <p className="text-[9px] font-bold text-amber-500">
                    ~{order.estimatedTime}min
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Summary Card ────────────────────────────────────────────────── */

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

/* ── Billing Panel (Orders + Payment Collection + Discounts) ───── */

function BillingPanel({
  restaurantId,
  staffRole,
  currency,
  onRefresh,
}: {
  restaurantId: string;
  staffRole: string;
  currency: string;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("unpaid");
  const [payType, setPayType] = useState<"all" | "cash" | "online">("all");
  const [search, setSearch] = useState("");

  // Collect payment modal
  const [selectedOrder, setSelectedOrder] = useState<BillOrder | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collectMethod, setCollectMethod] = useState<string>("CASH");
  const [collectTxn, setCollectTxn] = useState("");

  // Discount modal
  const [showDiscount, setShowDiscount] = useState(false);
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
  const [showTaxSettings, setShowTaxSettings] = useState(false);
  const [taxSaving, setTaxSaving] = useState(false);

  const canDiscount =
    staffRole === "MANAGER" ||
    staffRole === "SUPER_ADMIN" ||
    staffRole === "CASHIER";

  const loadOrders = useCallback(async () => {
    try {
      const data = await staffFetch(
        `/api/restaurants/${restaurantId}/billing?filter=${filter}`,
      );
      const fetched: BillOrder[] = data.orders || [];

      if (!isFirstLoad.current) {
        const newOnes = fetched.filter((o) => !knownOrderIds.current.has(o.id));
        if (newOnes.length > 0) playNewOrderSound();
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

  /* ── Actions ──────────────────────────────────────────────────── */

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
      showToast("Payment collected!", "success");
      loadOrders();
      loadSummary();
      onRefresh();
    } catch {
      showToast("Failed to collect payment", "error");
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
      showToast("Discount applied!", "success");
      loadOrders();
      loadSummary();
      onRefresh();
    } catch {
      showToast("Failed to apply discount", "error");
    }
    setActionLoading(false);
  };

  const isCashOrder = (o: BillOrder) =>
    !o.payment || o.payment.method === "CASH";
  const isOnlineOrder = (o: BillOrder) =>
    o.payment && o.payment.method !== "CASH";

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF9933]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Daily Summary Cards ──────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Revenue"
            value={formatPrice(summary.totalRevenue, currency)}
            icon={TrendingUp}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <SummaryCard
            label="Cash Collected"
            value={formatPrice(summary.cashRevenue, currency)}
            icon={DollarSign}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <SummaryCard
            label="Pending"
            value={formatPrice(summary.pendingAmount, currency)}
            icon={Clock}
            color="text-orange-600"
            bg="bg-orange-50"
            highlight={summary.pendingAmount > 0}
          />
          <SummaryCard
            label="Discounts"
            value={formatPrice(summary.totalDiscount, currency)}
            icon={Tag}
            color="text-pink-600"
            bg="bg-pink-50"
          />
        </div>
      )}

      {/* ── Stats Row ────────────────────────────────── */}
      {summary && (
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
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
              {formatPrice(summary.onlineRevenue, currency)} online
            </span>
          )}
          <button
            onClick={() => setShowTaxSettings((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-200 transition-all"
          >
            <Settings className="h-3 w-3" />
            Tax &amp; Charges
          </button>
        </div>
      )}

      {/* ── Tax & Charges Settings (inline) ──────────── */}
      <AnimatePresence>
        {showTaxSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tax &amp; Service Charge
                </h3>
                <button
                  onClick={() => setShowTaxSettings(false)}
                  className="rounded-full bg-gray-100 p-1 text-gray-400 hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Tax */}
                <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F2A2A]">
                      Tax (VAT)
                    </span>
                    <button
                      onClick={() => setTaxEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${taxEnabled ? "bg-[#0A4D3C]" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${taxEnabled ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  {taxEnabled && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) =>
                          setTaxRate(
                            Math.max(
                              0,
                              Math.min(100, parseFloat(e.target.value) || 0),
                            ),
                          )
                        }
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-[#1F2A2A] outline-none focus:border-[#0A4D3C]"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  )}
                </div>
                {/* Service Charge */}
                <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F2A2A]">
                      Service Charge
                    </span>
                    <button
                      onClick={() => setScEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${scEnabled ? "bg-[#0A4D3C]" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${scEnabled ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  {scEnabled && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={scRate}
                        onChange={(e) =>
                          setScRate(
                            Math.max(
                              0,
                              Math.min(100, parseFloat(e.target.value) || 0),
                            ),
                          )
                        }
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold text-[#1F2A2A] outline-none focus:border-[#0A4D3C]"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  setTaxSaving(true);
                  try {
                    await staffFetch(
                      `/api/restaurants/${restaurantId}/tax-config`,
                      {
                        method: "PUT",
                        body: JSON.stringify({
                          taxRate,
                          taxEnabled,
                          serviceChargeRate: scRate,
                          serviceChargeEnabled: scEnabled,
                        }),
                      },
                    );
                    showToast("Tax settings saved", "success");
                  } catch {
                    showToast("Failed to save", "error");
                  }
                  setTaxSaving(false);
                }}
                disabled={taxSaving}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] py-2 text-xs font-bold text-white hover:bg-[#083a2d] disabled:bg-gray-300 transition-all"
              >
                {taxSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {taxSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cash vs Online Tabs ──────────────────────── */}
      <div className="flex rounded-2xl bg-gray-100/80 p-1 gap-1">
        {(
          [
            {
              key: "all" as const,
              label: "All Orders",
              short: "All",
              icon: Receipt,
              count: orders.length,
            },
            {
              key: "cash" as const,
              label: "Cash Bills",
              short: "Cash",
              icon: Banknote,
              count: cashCount,
            },
            {
              key: "online" as const,
              label: "Online Receipts",
              short: "Online",
              icon: ScanLine,
              count: onlineCount,
            },
          ] as const
        ).map((t) => {
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
              <span className="sm:hidden">{t.short}</span>
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

      {/* Context hint */}
      {payType === "cash" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
          <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            <span className="font-bold">Cash Bills</span> — Customer pays at
            counter. Collect cash and mark as paid.
          </p>
        </div>
      )}
      {payType === "online" && (
        <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5">
          <ScanLine className="h-4 w-4 text-purple-600 shrink-0" />
          <p className="text-xs text-purple-700 font-medium">
            <span className="font-bold">Online Receipts</span> — Payment via
            eSewa / Khalti / Bank. View or print the receipt.
          </p>
        </div>
      )}

      {/* ── Filter + Search ──────────────────────────── */}
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

      {/* ── Orders List ──────────────────────────────── */}
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
                  <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    Room {order.roomNo}
                  </span>
                )}
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-gray-100"}`}
                >
                  {order.status}
                </span>
                {order.type !== "DINE_IN" && (
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {order.type === "DELIVERY" ? "Delivery" : "Takeaway"}
                  </span>
                )}
                {order.payment ? (
                  order.payment.method === "CASH" ? (
                    <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Banknote className="h-2.5 w-2.5" />
                      Cash
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 rounded-lg bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      <ScanLine className="h-2.5 w-2.5" />
                      {paymentMethodLabel(order.payment.method)}
                    </span>
                  )
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                {isPaid(order) ? (
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700 animate-pulse">
                    <Clock className="h-3 w-3" />
                    UNPAID
                  </span>
                )}
              </div>
            </div>

            {/* Online txn ID */}
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

            {/* Customer note */}
            {order.note && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                <strong>Note:</strong> {order.note}
              </div>
            )}

            {/* Items */}
            <div className="space-y-1 mb-3">
              {order.items.slice(0, 4).map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-bold text-gray-500">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
              ))}
              {order.items.length > 4 && (
                <p className="text-[10px] text-gray-400">
                  +{order.items.length - 4} more items
                </p>
              )}
            </div>

            {/* ── Bill breakdown with Tax & Discount ─── */}
            <div className="rounded-xl bg-gray-50 p-3 space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(order.bill?.subtotal ?? order.subtotal, currency)}
                </span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium">
                    {formatPrice(order.bill?.tax ?? order.tax, currency)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.serviceCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    Service Charge ({scRate}%)
                  </span>
                  <span className="font-medium">
                    {formatPrice(order.bill.serviceCharge, currency)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-pink-600 font-medium">Discount</span>
                  <span className="font-medium text-pink-600">
                    -{formatPrice(order.bill.discount, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-gray-200 pt-1.5 mt-1.5">
                <span className="text-[#1F2A2A]">Total</span>
                <span className="text-[#1F2A2A]">
                  {formatPrice(order.bill?.total ?? order.total, currency)}
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
                    <User className="h-2.5 w-2.5" />
                    {order.user.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* View Bill */}
                <a
                  href={`/bill/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-all"
                >
                  <ExternalLink className="h-3 w-3" />
                  Bill
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

                {/* Discount */}
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

                {/* Collect Payment */}
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Collect Payment Modal ─────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
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
                    {selectedOrder.tableNo
                      ? ` · Table ${selectedOrder.tableNo}`
                      : ""}
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

              {/* Amount Due */}
              <div className="rounded-2xl bg-gray-50 p-4 mb-5 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Amount Due
                </p>
                <p className="text-3xl font-extrabold text-[#1F2A2A]">
                  {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, currency)}
                </p>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <p className="text-xs text-pink-600 mt-1">
                      Discount applied: {formatPrice(selectedOrder.bill.discount, currency)}
                    </p>
                  )}
              </div>

              {/* Bill breakdown in modal */}
              <div className="rounded-xl bg-gray-50 p-3 space-y-1 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subtotal</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.subtotal ?? selectedOrder.subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span>
                    {formatPrice(selectedOrder.bill?.tax ?? selectedOrder.tax, currency)}
                  </span>
                </div>
                {selectedOrder.bill && selectedOrder.bill.serviceCharge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      Service Charge ({scRate}%)
                    </span>
                    <span>
                      {formatPrice(selectedOrder.bill.serviceCharge, currency)}
                    </span>
                  </div>
                )}
                {selectedOrder.bill && selectedOrder.bill.discount > 0 && (
                  <div className="flex justify-between text-xs text-pink-600">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedOrder.bill.discount, currency)}</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
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
                  {actionLoading ? "Processing..." : "Confirm Paid"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── Apply Discount Modal ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
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
                    {formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, currency)}
                  </span>
                </div>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-pink-600">Existing Discount</span>
                      <span className="font-bold text-pink-600">
                        {formatPrice(selectedOrder.bill.discount, currency)}
                      </span>
                    </div>
                  )}
              </div>

              {/* Discount inputs */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Discount Amount
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
                      {formatPrice(amt, currency)}
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
                        {pct}% ({formatPrice(amt, currency)})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview new total */}
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
                      ), currency)}
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

/* ── MAIN COUNTER PAGE ───────────────────────────────────────────── */

type ViewMode = "billing" | "board" | "split" | "stock" | FeatureTabId;

export default function CounterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // SSE orders for token board
  const [sseOrders, setSseOrders] = useState<SSEOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevReadyCountRef = useRef(0);

  const [viewMode, setViewMode] = useState<ViewMode>("split");

  // Attendance
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Load staff session
  useEffect(() => {
    fetch("/api/staff-session")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSession(data);
        staffFetch("/api/staff/attendance")
          .then(({ record }) => setIsPunchedIn(!!record && !record.checkOut))
          .catch(() => {});
      })
      .catch(() => router.push("/staff-login"))
      .finally(() => setLoading(false));
  }, [router]);

  // SSE for real-time token board
  const loadOrders = useCallback(async () => {
    if (!session) return;
    try {
      const data = await staffFetch(
        `/api/restaurants/${session.restaurantId}/orders?limit=50`,
      );
      setSseOrders(data.orders || []);
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource(
          `/api/restaurants/${session.restaurantId}/orders/stream`,
        );

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "orders" && data.orders) {
              setSseOrders(data.orders);

              if (soundEnabled) {
                const readyCount = data.orders.filter(
                  (o: SSEOrder) => o.status === "READY",
                ).length;
                if (readyCount > prevReadyCountRef.current) {
                  playReadySound();
                  showToast(
                    `${readyCount - prevReadyCountRef.current} order${readyCount - prevReadyCountRef.current > 1 ? "s" : ""} ready!`,
                    "success",
                  );
                }
                prevReadyCountRef.current = readyCount;

                if (data.newPendingCount > 0) {
                  playNewOrderSound();
                }
              }
            }
          } catch {
            /* ignore */
          }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          if (!fallbackInterval) {
            fallbackInterval = setInterval(loadOrders, 8000);
          }
        };
      } catch {
        loadOrders();
        fallbackInterval = setInterval(loadOrders, 8000);
      }
    };

    loadOrders();
    connectSSE();

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePunch = async () => {
    setAttendanceLoading(true);
    try {
      const action = isPunchedIn ? "PUNCH_OUT" : "PUNCH_IN";
      await staffFetch("/api/staff/attendance", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const { record } = await staffFetch("/api/staff/attendance");
      setIsPunchedIn(!!record && !record.checkOut);
    } catch {
      showToast("Failed to punch", "error");
    }
    setAttendanceLoading(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/staff-session", { method: "DELETE" });
    router.push("/staff-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#FF9933] animate-spin" />
          <p className="text-sm font-medium text-gray-500">
            Loading counter...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl shadow-[0_1px_12px_rgba(0,0,0,0.06)] border-b border-gray-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-[#FF9933]" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-[#1F2A2A]">
                Himal<span className="text-[#FF9933]">Hub</span>
              </span>
              <span className="ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50">
                Counter
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-white overflow-x-auto">
                {(
                  [
                    { id: "billing", icon: Receipt, label: "Billing" },
                    { id: "board", icon: Monitor, label: "Board" },
                    { id: "split", icon: Utensils, label: "Split" },
                    { id: "stock", icon: Package, label: "Stock" },
                    ...(session?.restaurantType && (session.role === "SUPER_ADMIN" || session.role === "MANAGER")
                      ? getFeatureTabsForType(session.restaurantType).map((f) => ({
                          id: f.id,
                          icon: Receipt,
                          label: f.label,
                        }))
                      : []),
                  ] as { id: ViewMode; icon: typeof Monitor; label: string }[]
                ).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-all whitespace-nowrap ${
                      viewMode === v.id
                        ? "bg-[#0A4D3C] text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <v.icon className="h-3 w-3" />
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Sound */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`rounded-lg p-2 transition-all ${
                  soundEnabled
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>

              {/* Punch In/Out */}
              <button
                onClick={handlePunch}
                disabled={attendanceLoading}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all ${
                  isPunchedIn
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                {attendanceLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPunchedIn ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {isPunchedIn ? "Punched In" : "Punch In"}
                </span>
              </button>

              {/* Kitchen link */}
              <a
                href="/kitchen"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                <ChefHat className="h-3 w-3" />
                <span className="hidden sm:inline">Kitchen</span>
              </a>

              {/* Staff */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{session.name}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center rounded-lg px-2 py-1.5 text-[11px] font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile View Toggle */}
      <div className="sm:hidden sticky top-14 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-white overflow-x-auto">
          {(
            [
              { id: "billing", icon: Receipt, label: "Billing" },
              { id: "board", icon: Monitor, label: "Board" },
              { id: "split", icon: Utensils, label: "Split" },
              { id: "stock", icon: Package, label: "Stock" },
              ...(session?.restaurantType && (session.role === "SUPER_ADMIN" || session.role === "MANAGER")
                ? getFeatureTabsForType(session.restaurantType).map((f) => ({
                    id: f.id,
                    icon: Receipt,
                    label: f.label,
                  }))
                : []),
            ] as { id: ViewMode; icon: typeof Monitor; label: string }[]
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] font-bold transition-all whitespace-nowrap ${
                viewMode === v.id
                  ? "bg-[#0A4D3C] text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <v.icon className="h-3 w-3" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-5 space-y-5">
        {viewMode === "billing" && (
          <BillingPanel
            restaurantId={session.restaurantId}
            staffRole={session.role}
            currency={session.currency ?? "NPR"}
            onRefresh={loadOrders}
          />
        )}

        {viewMode === "board" && <TokenBoard orders={sseOrders} />}

        {viewMode === "split" && (
          <div className="grid lg:grid-cols-5 gap-5">
            {/* Token Board — 2 columns */}
            <div className="lg:col-span-2">
              <TokenBoard orders={sseOrders} />
            </div>
            {/* Billing Panel — 3 columns */}
            <div className="lg:col-span-3">
              <BillingPanel
                restaurantId={session.restaurantId}
                staffRole={session.role}
                currency={session.currency ?? "NPR"}
                onRefresh={loadOrders}
              />
            </div>
          </div>
        )}

        {viewMode === "stock" && <StockTab />}

        {/* Type-specific feature tabs */}
        {(() => {
          const FeatureComponent = COUNTER_FEATURE_COMPONENTS[viewMode as FeatureTabId];
          if (!FeatureComponent) return null;
          return <FeatureComponent />;
        })()}
      </main>
    </div>
  );
}
