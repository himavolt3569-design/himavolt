"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
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
  Filter,
  Utensils,
  ScanLine,
  Monitor,
  Settings,
  Package,
  GalleryHorizontalEnd,
  BedDouble,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantOrdersTopic } from "@/lib/realtime-topics";
import { formatPrice } from "@/lib/currency";
import { autoPrintBill, printBillForOrder } from "@/lib/print-bill";
import { type FeatureTabId } from "@/lib/restaurant-types";
import NumberInput from "@/components/shared/NumberInput";

const CounterTabLoader = () => (
  <div className="flex min-h-[260px] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
  </div>
);

const lazyCounterTab = <T,>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
) => dynamic(loader, { loading: CounterTabLoader, ssr: false });

const StockTab = lazyCounterTab(() => import("@/components/dashboard/StockTab"));
const GlobalChatButton = dynamic(
  () => import("@/components/chat/GlobalChatButton"),
  { ssr: false },
);
const ThemeToggle = dynamic(() => import("@/components/shared/ThemeToggle"), {
  ssr: false,
});
const ManualBillingTab = lazyCounterTab(
  () => import("@/components/dashboard/ManualBillingTab"),
);
const TablesTab = lazyCounterTab(() => import("@/components/dashboard/TablesTab"));
const MediaTab = lazyCounterTab(() => import("@/components/dashboard/MediaTab"));
const RoomManagementTab = lazyCounterTab(
  () => import("@/components/dashboard/RoomManagementTab"),
);
const HotelBookingsTab = lazyCounterTab(
  () => import("@/components/dashboard/HotelBookingsTab"),
);
const HotelQRTab = lazyCounterTab(() => import("@/components/dashboard/HotelQRTab"));
const RoomQRTab = lazyCounterTab(() => import("@/components/dashboard/RoomQRTab"));
const GuestCheckInTab = lazyCounterTab(
  () => import("@/components/dashboard/GuestCheckInTab"),
);
const QuickCounterTab = lazyCounterTab(
  () => import("@/components/dashboard/features/QuickCounterTab"),
);
const ComboMealsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/ComboMealsTab"),
);
const RushHourTab = lazyCounterTab(
  () => import("@/components/dashboard/features/RushHourTab"),
);
const TakeawayTab = lazyCounterTab(
  () => import("@/components/dashboard/features/TakeawayTab"),
);
const RoomServiceTab = lazyCounterTab(
  () => import("@/components/dashboard/features/RoomServiceTab"),
);
const MultiOutletTab = lazyCounterTab(
  () => import("@/components/dashboard/features/MultiOutletTab"),
);
const EventCateringTab = lazyCounterTab(
  () => import("@/components/dashboard/features/EventCateringTab"),
);
const GuestBillingTab = lazyCounterTab(
  () => import("@/components/dashboard/features/GuestBillingTab"),
);
const BuffetManagerTab = lazyCounterTab(
  () => import("@/components/dashboard/features/BuffetManagerTab"),
);
const PreOrdersTab = lazyCounterTab(
  () => import("@/components/dashboard/features/PreOrdersTab"),
);
const CustomCakesTab = lazyCounterTab(
  () => import("@/components/dashboard/features/CustomCakesTab"),
);
const DailySpecialsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/DailySpecialsTab"),
);
const DisplayCounterTab = lazyCounterTab(
  () => import("@/components/dashboard/features/DisplayCounterTab"),
);
const DeliveryOpsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/DeliveryOpsTab"),
);
const MultiBrandTab = lazyCounterTab(
  () => import("@/components/dashboard/features/MultiBrandTab"),
);
const DeliveryZonesTab = lazyCounterTab(
  () => import("@/components/dashboard/features/DeliveryZonesTab"),
);
const PackageTrackingTab = lazyCounterTab(
  () => import("@/components/dashboard/features/PackageTrackingTab"),
);
const HappyHoursTab = lazyCounterTab(
  () => import("@/components/dashboard/features/HappyHoursTab"),
);
const TabManagementTab = lazyCounterTab(
  () => import("@/components/dashboard/features/TabManagementTab"),
);
const CocktailMenuTab = lazyCounterTab(
  () => import("@/components/dashboard/features/CocktailMenuTab"),
);
const LiveEventsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/LiveEventsTab"),
);
const LoyaltyRewardsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/LoyaltyRewardsTab"),
);
const WifiSeatingTab = lazyCounterTab(
  () => import("@/components/dashboard/features/WifiSeatingTab"),
);
const SeasonalMenuTab = lazyCounterTab(
  () => import("@/components/dashboard/features/SeasonalMenuTab"),
);
const BrunchModeTab = lazyCounterTab(
  () => import("@/components/dashboard/features/BrunchModeTab"),
);
const TableReservationsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/TableReservationsTab"),
);
const WaitlistTab = lazyCounterTab(
  () => import("@/components/dashboard/features/WaitlistTab"),
);
const PrivateDiningTab = lazyCounterTab(
  () => import("@/components/dashboard/features/PrivateDiningTab"),
);
const WifiSettingsTab = lazyCounterTab(
  () => import("@/components/dashboard/features/WifiSettingsTab"),
);

// Granular feature tabs surfaced in the staff counter portal. The consolidated
// `hotel-hub` tab is an owner-dashboard concept only — staff get the individual
// hotel sub-features (rooms, bookings, QR, etc.) — so it is intentionally absent
// here. The lookup below guards the missing-key case with `if (!FeatureComponent)`.
const COUNTER_FEATURE_COMPONENTS: Partial<
  Record<FeatureTabId, React.ComponentType>
> = {
  "quick-counter": QuickCounterTab,
  "combo-meals": ComboMealsTab,
  "rush-hour": RushHourTab,
  takeaway: TakeawayTab,
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
  waitlist: WaitlistTab,
  "private-dining": PrivateDiningTab,
  "wifi-settings": WifiSettingsTab,
  "guest-checkin": GuestCheckInTab,
  "room-qr-codes": RoomQRTab,
  "hotel-bookings": HotelBookingsTab,
  "hotel-qr": HotelQRTab,
  "rooms": RoomManagementTab,
};

interface StaffSession {
  userId: string;
  staffId: string;
  restaurantId: string;
  role: string;
  name: string;
  restaurantType: string;
  currency: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  taxRate: number;
  taxEnabled: boolean;
  posEnabled?: boolean;
  printAutoReceipt?: boolean;
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-[var(--accent-muted)] text-[#b25c1c]",
  DELIVERED: "bg-[var(--surface)] text-[var(--text-2)]",
  CANCELLED: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
};

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

function TokenBoard({ orders }: { orders: SSEOrder[] }) {
  const readyOrders = orders.filter((o) => o.status === "ACCEPTED");
  const preparingOrders = orders.filter((o) => o.status === "ACCEPTED");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-linear-to-br from-[#eaa94d] to-[#d67620] p-5 shadow-lg shadow-[var(--accent)]/20">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-white" />
          <h2 className="text-lg font-extrabold text-white">
            Ready for Pickup
          </h2>
          {readyOrders.length > 0 && (
            <span className="ml-auto rounded-full bg-[var(--canvas)]/20 px-2.5 py-0.5 text-sm font-bold text-white">
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
                  className="relative overflow-hidden rounded-xl bg-[var(--canvas)] p-3 text-center shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <p className="text-xl font-black text-[#b25c1c] leading-tight break-all">
                      #{order.orderNo.split("-").pop()}
                    </p>
                  </motion.div>
                  <p className="text-[10px] font-bold text-[#b25c1c] mt-1 truncate">
                    {order.tableNo
                      ? `Table ${order.tableNo}`
                      : order.type === "DELIVERY"
                        ? "Delivery"
                        : order.type === "TAKEAWAY"
                          ? "Takeaway"
                          : "Dine-in"}
                  </p>
                  {order.user?.name && (
                    <p className="text-[10px] text-[var(--text-3)] truncate">
                      {order.user.name}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-linear-to-br from-amber-400 to-amber-500 p-5 shadow-lg shadow-amber-200/50">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-5 w-5 text-white" />
          <h2 className="text-lg font-extrabold text-white">Being Prepared</h2>
          {preparingOrders.length > 0 && (
            <span className="ml-auto rounded-full bg-[var(--canvas)]/20 px-2.5 py-0.5 text-sm font-bold text-white">
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
                className="overflow-hidden rounded-lg bg-[var(--canvas)]/90 backdrop-blur p-2 text-center hover:scale-[1.03] transition-all duration-200"
              >
                <p className="text-base font-black text-amber-600 leading-tight break-all">
                  #{order.orderNo.split("-").pop()}
                </p>
                {order.estimatedTime && (
                  <p className="text-[9px] font-bold text-amber-500 mt-0.5">
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
      className={`rounded-2xl border p-3.5 transition-all hover:scale-[1.02] duration-200 ${
        highlight
          ? "border-brand-200 bg-brand-50/30 shadow-sm"
          : "border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-base font-extrabold text-[var(--text-1)]">{value}</p>
    </div>
  );
}

/* ── Billing Panel (Orders + Payment Collection + Discounts) ───── */

const isCashOrder = (o: BillOrder) => !o.payment || o.payment.method === "CASH";
const isOnlineOrder = (o: BillOrder) => o.payment && o.payment.method !== "CASH";

function BillingPanel({
  restaurantId,
  staffRole,
  currency,
  onRefresh,
  printAutoReceipt = false,
}: {
  restaurantId: string;
  staffRole: string;
  currency: string;
  onRefresh: () => void;
  printAutoReceipt?: boolean;
}) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("unpaid");
  const [payType, setPayType] = useState<"all" | "cash" | "online">("all");
  const [search, setSearch] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<BillOrder | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collectMethod, setCollectMethod] = useState<string>("CASH");
  const [collectTxn, setCollectTxn] = useState("");

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
      const paidOrderId = selectedOrder.id;
      setSelectedOrder(null);
      showToast("Payment collected!", "success");
      // Auto-print the settled receipt when the venue has it enabled.
      if (printAutoReceipt) autoPrintBill(paidOrderId);
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
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
            color="text-[#b25c1c]"
            bg="bg-[var(--accent-muted)]"
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
            color="text-[var(--accent-text)]"
            bg="bg-[var(--accent-muted)]"
          />
        </div>
      )}

      {/* ── Stats Row ────────────────────────────────── */}
      {summary && (
        <div className="flex items-center gap-4 text-xs text-[var(--text-2)] flex-wrap">
          <span className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {summary.totalOrders} orders today
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-[#d67620]" />
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
            className="ml-auto flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-2)] hover:bg-gray-200 transition-all"
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
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Tax &amp; Service Charge
                </h3>
                <button
                  onClick={() => setShowTaxSettings(false)}
                  className="rounded-full bg-[var(--surface)] p-1 text-[var(--text-3)] hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border-soft)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-1)]">
                      Tax (VAT)
                    </span>
                    <button
                      onClick={() => setTaxEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${taxEnabled ? "bg-brand-400" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-[var(--canvas)] shadow transition-transform ${taxEnabled ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  {taxEnabled && (
                    <div className="flex items-center gap-1.5">
                      <NumberInput
                        value={taxRate}
                        onChange={(n) => setTaxRate(n)}
                        min={0}
                        max={100}
                        step={0.1}
                        decimal
                        className="w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-bold text-[var(--text-1)] outline-none focus:border-brand-400"
                      />
                      <span className="text-xs text-[var(--text-3)]">%</span>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--border-soft)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-1)]">
                      Service Charge
                    </span>
                    <button
                      onClick={() => setScEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${scEnabled ? "bg-brand-400" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-[var(--canvas)] shadow transition-transform ${scEnabled ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                  {scEnabled && (
                    <div className="flex items-center gap-1.5">
                      <NumberInput
                        value={scRate}
                        onChange={(n) => setScRate(n)}
                        min={0}
                        max={100}
                        step={0.1}
                        decimal
                        className="w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-bold text-[var(--text-1)] outline-none focus:border-brand-400"
                      />
                      <span className="text-xs text-[var(--text-3)]">%</span>
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
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 py-2 text-xs font-bold text-white hover:bg-brand-500 disabled:bg-gray-300 transition-all"
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
      <div className="flex rounded-2xl bg-brand-50/60 p-1 gap-1">
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
                    ? "bg-[var(--canvas)] text-[#b25c1c] shadow-sm"
                    : t.key === "online"
                      ? "bg-[var(--canvas)] text-purple-700 shadow-sm"
                      : "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isActive
                    ? t.key === "cash"
                      ? "text-[#d67620]"
                      : t.key === "online"
                        ? "text-purple-500"
                        : "text-[var(--text-1)]"
                    : "text-[var(--text-3)]"
                }`}
              />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
              {t.count > 0 && (
                <span
                  className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    isActive
                      ? t.key === "cash"
                        ? "bg-[var(--accent-muted)] text-[#b25c1c]"
                        : t.key === "online"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-[var(--surface)] text-[var(--text-2)]"
                      : "bg-gray-200 text-[var(--text-2)]"
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
          <Banknote className="h-4 w-4 text-[#b25c1c] shrink-0" />
          <p className="text-xs text-[#b25c1c] font-medium">
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
                  ? "bg-brand-400 text-white shadow-sm shadow-brand-400/20"
                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-brand-50"
              }`}
            >
              <Filter className="h-3 w-3" />
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    filter === f.key
                      ? "bg-[var(--canvas)]/20 text-white"
                      : "bg-gray-300 text-[var(--text-2)]"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, table..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all"
          />
        </div>
      </div>

      {/* ── Orders List ──────────────────────────────── */}
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

      <div className="space-y-3">
        {filtered.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl bg-[var(--canvas)] border p-4 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 ${
              isPaid(order)
                ? "border-[var(--border-soft)]"
                : "border-orange-200 bg-orange-50/20"
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
                  <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    Room {order.roomNo}
                  </span>
                )}
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-[var(--surface)]"}`}
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
                    <span className="flex items-center gap-0.5 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] px-2 py-0.5 text-[10px] font-bold text-[#b25c1c]">
                      <Banknote className="h-2.5 w-2.5" />
                      Cash
                    </span>
                  ) : order.payment.method === "DIRECT" ? (
                    <span
                      className={`flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                        order.payment.status === "COMPLETED"
                          ? "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[#b25c1c]"
                          : "bg-orange-50 border-orange-200 text-orange-700"
                      }`}
                    >
                      <Receipt className="h-2.5 w-2.5" />
                      Fast Pay &middot;{" "}
                      {order.payment.status === "COMPLETED" ? "Paid" : "Unpaid"}
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
                  <span className="flex items-center gap-1 rounded-lg bg-[var(--accent-muted)] px-2 py-1 text-[10px] font-bold text-[#b25c1c]">
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

            {order.note && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                <strong>Note:</strong> {order.note}
              </div>
            )}

            <div className="space-y-1 mb-3">
              {order.items.slice(0, 4).map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-bold text-[var(--text-2)]">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
              ))}
              {order.items.length > 4 && (
                <p className="text-[10px] text-[var(--text-3)]">
                  +{order.items.length - 4} more items
                </p>
              )}
            </div>

            {/* ── Bill breakdown with Tax & Discount ─── */}
            <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-2)]">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(
                    order.bill?.subtotal ?? order.subtotal,
                    currency,
                  )}
                </span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span className="font-medium">
                    {formatPrice(order.bill?.tax ?? order.tax, currency)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.serviceCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">
                    Service Charge ({scRate}%)
                  </span>
                  <span className="font-medium">
                    {formatPrice(order.bill.serviceCharge, currency)}
                  </span>
                </div>
              )}
              {order.bill && order.bill.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--accent-text)] font-medium">
                    Discount
                  </span>
                  <span className="font-medium text-[var(--accent-text)]">
                    -{formatPrice(order.bill.discount, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-[var(--border)] pt-1.5 mt-1.5">
                <span className="text-[var(--text-1)]">Total</span>
                <span className="text-[var(--text-1)]">
                  {formatPrice(order.bill?.total ?? order.total, currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-3)]">
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
                {/* Print Bill — merged action. One click opens the print dialog
                    with the thermal receipt; it never opens a separate tab. */}
                <button
                  onClick={() => printBillForOrder(order.id)}
                  className="flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-2)] hover:bg-gray-200 transition-all"
                  title="Print bill"
                >
                  <Printer className="h-3 w-3" />
                  Bill
                </button>

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

                {!isPaid(order) &&
                  order.status !== "REJECTED" &&
                  order.status !== "REJECTED" && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setCollectMethod(order.payment?.method || "CASH");
                        setShowCollect(true);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-[#eaa94d] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#d67620] transition-all shadow-sm"
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
              className="w-full max-w-md rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-1)]">
                    Collect Payment
                  </h2>
                  <p className="text-xs text-[var(--text-3)]">
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
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--canvas-sub)] p-4 mb-5 text-center">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1">
                  Amount Due
                </p>
                <p className="text-3xl font-extrabold text-[var(--text-1)]">
                  {formatPrice(
                    selectedOrder.bill?.total ?? selectedOrder.total,
                    currency,
                  )}
                </p>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <p className="text-xs text-[var(--accent-text)] mt-1">
                      Discount applied:{" "}
                      {formatPrice(selectedOrder.bill.discount, currency)}
                    </p>
                  )}
              </div>

              <div className="rounded-xl bg-[var(--canvas-sub)] p-3 space-y-1 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Subtotal</span>
                  <span>
                    {formatPrice(
                      selectedOrder.bill?.subtotal ?? selectedOrder.subtotal,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span>
                    {formatPrice(
                      selectedOrder.bill?.tax ?? selectedOrder.tax,
                      currency,
                    )}
                  </span>
                </div>
                {selectedOrder.bill && selectedOrder.bill.serviceCharge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">
                      Service Charge ({scRate}%)
                    </span>
                    <span>
                      {formatPrice(selectedOrder.bill.serviceCharge, currency)}
                    </span>
                  </div>
                )}
                {selectedOrder.bill && selectedOrder.bill.discount > 0 && (
                  <div className="flex justify-between text-xs text-[var(--accent-text)]">
                    <span>Discount</span>
                    <span>
                      -{formatPrice(selectedOrder.bill.discount, currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
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
                              ? "border-[#eaa94d] bg-[var(--accent-muted)] shadow-sm"
                              : "border-[var(--border-soft)] bg-[var(--canvas)] hover:border-[var(--border)]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${isSelected ? "text-[#b25c1c]" : "text-[var(--text-3)]"}`}
                          />
                          <span
                            className={`text-xs font-bold ${isSelected ? "text-[#b25c1c]" : "text-[var(--text-2)]"}`}
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
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                    Transaction / Reference ID
                  </label>
                  <input
                    value={collectTxn}
                    onChange={(e) => setCollectTxn(e.target.value)}
                    placeholder="Enter transaction ID..."
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#eaa94d] focus:ring-2 focus:ring-[var(--accent-border)] transition-all"
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white hover:bg-[#d67620] disabled:bg-gray-300 transition-all shadow-sm"
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
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[var(--canvas-sub)] p-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">
                    Current Bill Total
                  </span>
                  <span className="font-bold text-[var(--text-1)]">
                    {formatPrice(
                      selectedOrder.bill?.total ?? selectedOrder.total,
                      currency,
                    )}
                  </span>
                </div>
                {selectedOrder.bill?.discount &&
                  selectedOrder.bill.discount > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-[var(--accent-text)]">
                        Existing Discount
                      </span>
                      <span className="font-bold text-[var(--accent-text)]">
                        {formatPrice(selectedOrder.bill.discount, currency)}
                      </span>
                    </div>
                  )}
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                    Discount Amount
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

              {discountAmount && parseFloat(discountAmount) > 0 && (
                <div className="rounded-xl bg-[var(--accent-muted)] p-3 mb-5 border border-[var(--accent-border)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--accent-text)] font-medium">
                      New Total after Discount
                    </span>
                    <span className="font-extrabold text-[var(--text-1)]">
                      {formatPrice(
                        Math.max(
                          0,
                          (selectedOrder.bill?.subtotal ??
                            selectedOrder.subtotal) +
                            (selectedOrder.bill?.tax ?? selectedOrder.tax) +
                            (selectedOrder.bill?.serviceCharge ?? 0) -
                            parseFloat(discountAmount),
                        ),
                        currency,
                      )}
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:bg-gray-300 transition-all shadow-sm"
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

type ViewMode =
  | "billing"
  | "board"
  | "split"
  | "stock"
  | "media"
  | "tables"
  | "manual"
  | FeatureTabId;

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

  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

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
                  (o: SSEOrder) => o.status === "ACCEPTED",
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

  // Instant WebSocket push (Supabase Realtime) for the token board. SSE above
  // remains the fallback and keeps driving the ready/new-order sounds.
  useRealtimeSignal(
    session ? restaurantOrdersTopic(session.restaurantId) : null,
    loadOrders,
  );

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
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
          <p className="text-sm font-medium text-[var(--text-2)]">
            Loading counter...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-1)] transition-colors">
      <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-2xl shadow-sm border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-brand-400" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-[var(--text-1)]">
                Hima<span className="text-brand-400">Volt</span>
              </span>
              <span className="ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50">
                Counter
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden lg:flex items-center gap-1 rounded-lg border border-brand-100 p-0.5 bg-[var(--canvas)]">
                {(
                  [
                    { id: "billing", icon: Receipt, label: "Billing" },
                    { id: "tables", icon: Utensils, label: "Tables" },
                    { id: "manual", icon: Tag, label: "Manual Order" },
                    { id: "board", icon: Monitor, label: "Board" },
                    { id: "split", icon: GalleryHorizontalEnd, label: "Split" },
                    { id: "stock", icon: Package, label: "Stock" },
                    { id: "media", icon: GalleryHorizontalEnd, label: "Media" },
                    ...( ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(session.restaurantType) ? [{ id: "rooms", icon: BedDouble, label: "Rooms" }] : [] )
                  ] as { id: ViewMode; icon: typeof Monitor; label: string }[]
                ).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-all whitespace-nowrap ${
                      viewMode === v.id
                        ? "bg-brand-400 text-white shadow-sm shadow-brand-400/20"
                        : "text-[var(--text-2)] hover:bg-brand-50"
                    }`}
                  >
                    <v.icon className="h-3 w-3" />
                    {v.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`rounded-lg p-2 transition-all ${
                  soundEnabled
                    ? "bg-[var(--accent-muted)] text-[#b25c1c]"
                    : "bg-[var(--surface)] text-[var(--text-3)]"
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
                    ? "bg-[var(--accent-muted)] text-[#b25c1c] hover:bg-[var(--accent-muted)]"
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

              <a
                href="/kitchen"
                className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                <ChefHat className="h-3 w-3" />
                <span className="hidden sm:inline">Kitchen</span>
              </a>

              {session.posEnabled && session.role !== "CHEF" && (
                <a
                  href="/pos/staff"
                  className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                >
                  <Monitor className="h-3 w-3" />
                  <span className="hidden sm:inline">POS</span>
                </a>
              )}

              <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1.5 text-[11px] font-bold text-[var(--text-2)]">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{session.name}</span>
              </div>

              <ThemeToggle />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center rounded-lg px-2 py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="sm:hidden sticky top-14 z-40 bg-[var(--canvas)]/80 backdrop-blur-xl border-b border-brand-100/60 px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-brand-100 p-0.5 bg-[var(--canvas)] overflow-x-auto scrollbar-slim">
          {(
            [
              { id: "billing", icon: Receipt, label: "Billing" },
              { id: "tables", icon: Utensils, label: "Tables" },
              { id: "manual", icon: Tag, label: "Manual" },
              { id: "board", icon: Monitor, label: "Board" },
              { id: "split", icon: GalleryHorizontalEnd, label: "Split" },
              { id: "stock", icon: Package, label: "Stock" },
              ...( ["HOTEL", "RESORT", "GUEST_HOUSE"].includes(session.restaurantType) ? [{ id: "rooms", icon: BedDouble, label: "Rooms" }] : [] )
            ] as { id: ViewMode; icon: typeof Monitor; label: string }[]
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] font-bold transition-all whitespace-nowrap ${
                viewMode === v.id
                  ? "bg-brand-400 text-white shadow-sm shadow-brand-400/20"
                  : "text-[var(--text-2)] hover:bg-brand-50"
              }`}
            >
              <v.icon className="h-3 w-3" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-5 space-y-5">
        {viewMode === "billing" && (
          <BillingPanel
            restaurantId={session.restaurantId}
            staffRole={session.role}
            currency={session.currency ?? "NPR"}
            onRefresh={loadOrders}
            printAutoReceipt={session.printAutoReceipt ?? false}
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
                printAutoReceipt={session.printAutoReceipt ?? false}
              />
            </div>
          </div>
        )}

        {viewMode === "tables" && (
          <TablesTab
            restaurantId={session.restaurantId}
            currency={session.currency}
          />
        )}
        {viewMode === "manual" && (
          <ManualBillingTab
            restaurantId={session.restaurantId}
            currency={session.currency}
            restaurantName={session.restaurantName}
            restaurantAddress={session.restaurantAddress}
            restaurantPhone={session.restaurantPhone}
            taxRate={session.taxRate}
            taxEnabled={session.taxEnabled}
            printAutoReceipt={session.printAutoReceipt ?? false}
          />
        )}
        {viewMode === "stock" && <StockTab />}
        {viewMode === "media" && (
          <MediaTab restaurantId={session?.restaurantId} />
        )}

        {/* Type-specific feature tabs */}
        {(() => {
          const FeatureComponent =
            COUNTER_FEATURE_COMPONENTS[viewMode as FeatureTabId];
          if (!FeatureComponent) return null;
          const Comp = FeatureComponent as React.ComponentType<{
            restaurantId?: string;
          }>;
          return <Comp restaurantId={session?.restaurantId} />;
        })()}
      </main>

      {session && (
        <GlobalChatButton
          restaurantId={session.restaurantId}
          staffRole={session.role}
          staffName={session.name}
        />
      )}
    </div>
  );
}
