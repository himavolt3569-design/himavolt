"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChefHat,
  Utensils,
  CreditCard,
  Mountain,
  Loader2,
  ClipboardList,
  UtensilsCrossed,
  MessageCircle,
  Package,
  User,
  Clock,
  Check,
  X,
  Play,
  Bell,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Send,
  Pencil,
  Receipt,
  Camera,
  GalleryHorizontalEnd,
} from "lucide-react";
import BillingTab from "@/components/billing/BillingTab";
import StoryManager from "@/components/stories/StoryManager";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import {
  getFeatureTabsForType,
  type FeatureTabId,
} from "@/lib/restaurant-types";

/* ── Lazy feature tab imports for staff ─────────────────────────── */
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
import WifiSettingsTab from "@/components/dashboard/features/WifiSettingsTab";
import GuestCheckInTab from "@/components/dashboard/GuestCheckInTab";
import MediaTab from "@/components/dashboard/MediaTab";

const STAFF_FEATURE_COMPONENTS: Record<FeatureTabId, React.ComponentType> = {
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
  "wifi-settings": WifiSettingsTab,
  "guest-checkin": GuestCheckInTab,
  "room-qr-codes": GuestCheckInTab,
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
}

interface Order {
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
  items: OrderItem[];
  user?: { name: string; email: string } | null;
  payment?: { method: string; status: string } | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string;
  category: { name: string; slug: string };
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPerUnit: number;
  category: string;
  notes: string | null;
}

interface ChatRoom {
  id: string;
  orderId: string;
  isActive: boolean;
  order: { orderNo: string; status: string; tableNo: number | null };
  messages: {
    id: string;
    content: string;
    sender: string;
    createdAt: string;
  }[];
}

type TabId = "orders" | "menu" | "chat" | "inventory" | "billing" | "stories" | "media" | FeatureTabId;

const ALL_TABS: {
  id: TabId;
  label: string;
  icon: typeof ClipboardList;
  roles: string[];
}[] = [
  {
    id: "orders",
    label: "Orders",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"],
  },
  {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "MANAGER", "CASHIER"],
  },
  {
    id: "menu",
    label: "Menu",
    icon: UtensilsCrossed,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF"],
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"],
  },
  {
    id: "inventory",
    label: "Stock",
    icon: Package,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF"],
  },
  {
    id: "stories",
    label: "Stories",
    icon: Camera,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"],
  },
  {
    id: "media",
    label: "Media",
    icon: GalleryHorizontalEnd,
    roles: ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"],
  },
];

const STATUS_ORDER = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-50 text-orange-700 border-orange-200",
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DELIVERED: "bg-gray-50 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_BORDER_LEFT: Record<string, string> = {
  PENDING: "border-l-orange-400",
  ACCEPTED: "border-l-blue-400",
  PREPARING: "border-l-amber-400",
  READY: "border-l-emerald-400",
  DELIVERED: "border-l-gray-300",
  CANCELLED: "border-l-red-400",
  REJECTED: "border-l-red-400",
};

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: typeof ChefHat; color: string; bg: string }
> = {
  CHEF: {
    label: "Chef",
    icon: ChefHat,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  WAITER: {
    label: "Waiter",
    icon: Utensils,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  CASHIER: {
    label: "Cashier",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  MANAGER: {
    label: "Manager",
    icon: User,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
};

/* ── Helpers ──────────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
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

/* ── ORDERS TAB ──────────────────────────────────────────────────── */

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    // Two-tone bell: C5 then E5
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
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

function OrdersTab({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [estTime, setEstTime] = useState("15");
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await staffFetch(
        `/api/restaurants/${restaurantId}/orders?limit=50`,
      );
      setOrders(data.orders || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [restaurantId]);

  // SSE-based real-time updates with polling fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource(`/api/restaurants/${restaurantId}/orders/stream`);

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "orders" && data.orders) {
              setOrders(data.orders);
              setLoading(false);

              // Play alert sound for new pending orders
              if (data.newPendingCount > 0) {
                playAlertSound();
                showToast(
                  `${data.newPendingCount} new order${data.newPendingCount > 1 ? "s" : ""}!`,
                  "info",
                );
              }
            }
          } catch {
            /* ignore parse errors */
          }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          // Fall back to polling
          if (!fallbackInterval) {
            fallbackInterval = setInterval(load, 8000);
          }
        };
      } catch {
        // EventSource not supported
        load();
        fallbackInterval = setInterval(load, 8000);
      }
    };

    load();
    connectSSE();

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (
    orderId: string,
    status: string,
    extra?: Record<string, unknown>,
  ) => {
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...extra }),
      });
      // SSE will pick up the change; also do an immediate fetch
      load();
    } catch {
      /* ignore */
    }
  };

  const handleAccept = async (orderId: string) => {
    const mins = parseInt(estTime, 10);
    if (!mins || mins < 1) {
      showToast("Please enter a valid estimated time", "error");
      return;
    }
    await updateStatus(orderId, "ACCEPTED", { estimatedTime: mins });
    setAcceptingId(null);
    setEstTime("15");
    showToast("Order accepted!", "success");
  };

  const handleReject = async (orderId: string) => {
    await updateStatus(orderId, "REJECTED");
    showToast("Order rejected", "info");
  };

  const filtered = orders.filter((o) => {
    if (filter === "active")
      return ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status);
    if (filter === "completed")
      return ["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status);
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex items-center gap-2">
        {["active", "completed", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold capitalize transition-all ${
              filter === f
                ? "bg-brand-400 text-white shadow-md shadow-brand-400/20"
                : "bg-white text-gray-500 border border-gray-200 hover:border-brand-200 hover:bg-brand-50/50"
            }`}
          >
            {f}
            {f === "active" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <ClipboardList className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-500">No orders</p>
          <p className="text-xs text-gray-400 mt-1">
            Orders will appear here when customers place them
          </p>
        </div>
      )}

      {/* Order Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl bg-white border border-gray-100 border-l-4 ${STATUS_BORDER_LEFT[order.status] || "border-l-gray-300"} p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-[#3e1e0c]">
                  #{order.orderNo}
                </span>
                {order.tableNo && (
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    Table {order.tableNo}
                  </span>
                )}
                {order.roomNo && (
                  <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    Room {order.roomNo}
                  </span>
                )}
                {order.type !== "DINE_IN" && (
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {order.type === "DELIVERY" ? "Delivery" : "Takeaway"}
                  </span>
                )}
              </div>
              <span
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border shrink-0 ${STATUS_COLORS[order.status] || "bg-gray-100"}`}
              >
                {order.status}
              </span>
            </div>

            {order.note && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                <strong>Note:</strong> {order.note}
              </div>
            )}

            {/* Items */}
            <div className="space-y-1 mb-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-bold text-gray-500">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <Clock className="h-3 w-3" />
                {timeAgo(order.createdAt)}
                {order.user?.name && <span>· {order.user.name}</span>}
                {order.estimatedTime && order.status !== "PENDING" && (
                  <span className="text-brand-400 font-bold">
                    · ~{order.estimatedTime}min
                  </span>
                )}
              </div>
              <span className="text-sm font-extrabold text-[#3e1e0c]">
                {formatPrice(order.total, currency)}
              </span>
            </div>

            {order.payment && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                <CreditCard className="h-3 w-3 text-gray-400" />
                <span className="font-bold text-gray-500">
                  {order.payment.method}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-bold ${
                    order.payment.status === "COMPLETED"
                      ? "bg-green-50 text-green-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {order.payment.status === "COMPLETED" ? "Paid" : "Pending"}
                </span>
              </div>
            )}

            {/* Actions */}
            {order.status === "PENDING" && (
              <div className="mt-3 space-y-2">
                <AnimatePresence>
                  {acceptingId === order.id ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-brand-50 p-3 space-y-2">
                        <label className="text-[11px] font-bold text-brand-700">
                          Estimated prep time (minutes)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              onClick={() =>
                                setEstTime((v) =>
                                  String(
                                    Math.max(1, parseInt(v || "0", 10) - 5),
                                  ),
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="relative flex-1">
                              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-400" />
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={estTime}
                                onChange={(e) => setEstTime(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-center text-sm font-bold text-[#3e1e0c] outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20"
                              />
                            </div>
                            <button
                              onClick={() =>
                                setEstTime((v) =>
                                  String(
                                    Math.min(120, parseInt(v || "0", 10) + 5),
                                  ),
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-gray-400">
                            min
                          </span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          {[10, 15, 20, 30, 45].map((t) => (
                            <button
                              key={t}
                              onClick={() => setEstTime(String(t))}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-all ${
                                estTime === String(t)
                                  ? "bg-brand-400 text-white"
                                  : "bg-white border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-400"
                              }`}
                            >
                              {t}m
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleAccept(order.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shadow-sm shadow-brand-400/20"
                          >
                            <Check className="h-3.5 w-3.5" /> Confirm Accept
                          </button>
                          <button
                            onClick={() => {
                              setAcceptingId(null);
                              setEstTime("15");
                            }}
                            className="rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-200 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAcceptingId(order.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shadow-sm shadow-brand-400/20"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleReject(order.id)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {order.status === "ACCEPTED" && (
              <button
                onClick={() => updateStatus(order.id, "PREPARING")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all"
              >
                <Play className="h-3.5 w-3.5" /> Start Preparing
              </button>
            )}
            {order.status === "PREPARING" && (
              <button
                onClick={() => updateStatus(order.id, "READY")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2.5 text-xs font-bold text-green-700 hover:bg-green-100 transition-all"
              >
                <Bell className="h-3.5 w-3.5" /> Mark Ready
              </button>
            )}
            {order.status === "READY" && (
              <button
                onClick={() => updateStatus(order.id, "DELIVERED")}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shadow-md shadow-brand-400/20"
              >
                <Check className="h-3.5 w-3.5" /> Mark Delivered
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── MENU TAB ────────────────────────────────────────────────────── */

function MenuTab({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await staffFetch(`/api/restaurants/${restaurantId}/menu`);
      setItems(data.items || data || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/menu/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !available }),
      });
      load();
    } catch {
      /* ignore */
    }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all shadow-sm"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <UtensilsCrossed className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-500">No items found</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search term
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-12 w-12 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${item.isVeg ? "bg-green-500" : "bg-red-500"}`}
                />
                <h4 className="text-sm font-bold text-[#3e1e0c] truncate">
                  {item.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-gray-500">
                  {formatPrice(item.price, currency)}
                </span>
                <span className="text-[10px] text-gray-400">
                  {item.category?.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleAvailability(item.id, item.isAvailable)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                item.isAvailable
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              {item.isAvailable ? (
                <ToggleRight className="h-3.5 w-3.5" />
              ) : (
                <ToggleLeft className="h-3.5 w-3.5" />
              )}
              {item.isAvailable ? "ON" : "OFF"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CHAT TAB ────────────────────────────────────────────────────── */

function ChatTab({
  restaurantId,
  staffRole,
  staffName,
}: {
  restaurantId: string;
  staffRole: string;
  staffName: string;
}) {
  const [tab, setTab] = useState<"customers" | "broadcast">("customers");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    {
      id: string;
      content: string;
      sender: string;
      senderName: string | null;
      createdAt: string;
    }[]
  >([]);
  const [msg, setMsg] = useState("");
  const [broadcastRoomId, setBroadcastRoomId] = useState<string | null>(null);
  const [broadcastMsgs, setBroadcastMsgs] = useState<
    {
      id: string;
      content: string;
      sender: string;
      senderName: string | null;
      createdAt: string;
    }[]
  >([]);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const broadcastSseRef = useRef<EventSource | null>(null);

  // Can this role send in broadcast channel?
  const canBroadcast = ["SUPER_ADMIN", "MANAGER"].includes(staffRole);
  // Sender label for current role
  const senderLabel =
    staffRole === "SUPER_ADMIN"
      ? "ADMIN"
      : (staffRole as "KITCHEN" | "BILLING" | "MANAGER");

  const loadRooms = useCallback(async () => {
    try {
      const data = await staffFetch(`/api/chat?restaurantId=${restaurantId}`);
      setRooms(data || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [restaurantId]);

  // SSE for active customer chat room
  const connectRoomSSE = useCallback((roomId: string) => {
    sseRef.current?.close();
    const es = new EventSource(`/api/chat/${roomId}/stream`);
    es.onmessage = (event) => {
      try {
        const newMsgs = JSON.parse(event.data);
        if (Array.isArray(newMsgs) && newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const added = newMsgs.filter((m) => !ids.has(m.id));
            if (added.length === 0) return prev;
            setTimeout(
              () =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              50,
            );
            return [...prev, ...added];
          });
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => connectRoomSSE(roomId), 4000);
    };
    sseRef.current = es;
  }, []);

  // SSE for broadcast channel
  const connectBroadcastSSE = useCallback((roomId: string) => {
    broadcastSseRef.current?.close();
    const es = new EventSource(`/api/chat/${roomId}/stream`);
    es.onmessage = (event) => {
      try {
        const newMsgs = JSON.parse(event.data);
        if (Array.isArray(newMsgs) && newMsgs.length > 0) {
          setBroadcastMsgs((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const added = newMsgs.filter((m) => !ids.has(m.id));
            if (added.length === 0) return prev;
            setTimeout(
              () =>
                broadcastEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              50,
            );
            return [...prev, ...added];
          });
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => connectBroadcastSSE(roomId), 4000);
    };
    broadcastSseRef.current = es;
  }, []);

  // Load broadcast channel
  useEffect(() => {
    (async () => {
      try {
        const room = await staffFetch(
          `/api/chat?restaurantId=${restaurantId}&type=BROADCAST`,
        );
        if (room?.id) {
          setBroadcastRoomId(room.id);
          const msgs = await staffFetch(`/api/chat/${room.id}/messages`);
          setBroadcastMsgs(msgs || []);
          connectBroadcastSSE(room.id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      broadcastSseRef.current?.close();
    };
  }, [restaurantId, connectBroadcastSSE]);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 10000); // refresh room list every 10s
    return () => clearInterval(interval);
  }, [loadRooms]);

  useEffect(() => {
    return () => {
      sseRef.current?.close();
    };
  }, []);

  const openRoom = async (roomId: string) => {
    setActiveRoom(roomId);
    try {
      const data = await staffFetch(`/api/chat/${roomId}/messages`);
      setMessages(data || []);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch {
      /* ignore */
    }
    connectRoomSSE(roomId);
  };

  const closeRoom = () => {
    sseRef.current?.close();
    setActiveRoom(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!msg.trim() || !activeRoom) return;
    const text = msg.trim();
    setMsg("");
    try {
      await staffFetch(`/api/chat/${activeRoom}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: text,
          sender: senderLabel,
          senderName: staffName,
        }),
      });
    } catch {
      setMsg(text);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || !broadcastRoomId || !canBroadcast) return;
    const text = broadcastMsg.trim();
    setBroadcastMsg("");
    try {
      await staffFetch(`/api/chat/${broadcastRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: text,
          sender: senderLabel,
          senderName: staffName,
        }),
      });
    } catch {
      setBroadcastMsg(text);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );

  // Active customer chat room view
  if (activeRoom) {
    const room = rooms.find((r) => r.id === activeRoom);
    return (
      <div className="flex flex-col h-[65vh]">
        <button
          onClick={closeRoom}
          className="flex items-center gap-2 text-sm font-bold text-brand-400 mb-3 hover:underline"
        >
          ← Back to chats
        </button>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-2 mb-2 flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-500">
            Order #{room?.order?.orderNo || "?"}
            {room?.order?.tableNo ? ` · Table ${room.order.tableNo}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] text-green-600 font-bold">Live</span>
          </span>
        </div>
        <div
          className="flex-1 overflow-y-auto space-y-2 mb-3 scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender !== "CUSTOMER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender !== "CUSTOMER"
                    ? "bg-brand-700 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-[#3e1e0c] rounded-bl-md"
                }`}
              >
                {m.sender !== "CUSTOMER" && m.senderName && (
                  <p className="text-[10px] font-bold text-white/60 mb-0.5">
                    {m.senderName}
                  </p>
                )}
                {m.content}
                <span className="block text-[9px] mt-0.5 opacity-50">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-10">
              No messages yet
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Reply to customer..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!msg.trim()}
            className="rounded-xl bg-brand-400 px-4 py-2.5 text-white hover:bg-brand-500 transition-all disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("customers")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
            tab === "customers"
              ? "bg-brand-400 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Customer Chats {rooms.length > 0 && `(${rooms.length})`}
        </button>
        <button
          onClick={() => setTab("broadcast")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
            tab === "broadcast"
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Staff Broadcast
        </button>
      </div>

      {tab === "customers" && (
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-500">No active chats</p>
              <p className="text-xs text-gray-400 mt-1">
                Chats appear when customers message about their order
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => openRoom(room.id)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-400 shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3e1e0c]">
                    Order #{room.order?.orderNo}
                    {room.order?.tableNo ? ` · T${room.order.tableNo}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {room.messages[0]?.content || "No messages yet"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {tab === "broadcast" && (
        <div className="flex flex-col h-[60vh]">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-3">
            <p className="text-xs font-bold text-amber-700">
              {canBroadcast
                ? "You can send broadcast messages visible to all staff"
                : "Read-only — only Admin/Manager can post here"}
            </p>
          </div>
          <div
            className="flex-1 overflow-y-auto space-y-2 mb-3 scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {broadcastMsgs.map((m) => {
              const isOwn = m.senderName === staffName;
              return (
                <div
                  key={m.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      isOwn
                        ? "bg-brand-400 text-white rounded-br-md"
                        : "bg-white border border-gray-200 text-[#3e1e0c] rounded-bl-md"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-[10px] font-bold text-gray-500 mb-0.5">
                        {m.senderName || m.sender}
                      </p>
                    )}
                    {m.content}
                    <span className="block text-[9px] mt-0.5 opacity-50">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            {broadcastMsgs.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-10">
                No broadcast messages yet
              </p>
            )}
            <div ref={broadcastEndRef} />
          </div>
          {canBroadcast && (
            <div className="flex gap-2">
              <input
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendBroadcast()}
                placeholder="Broadcast to all staff..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-all"
              />
              <button
                onClick={sendBroadcast}
                disabled={!broadcastMsg.trim()}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-white hover:bg-brand-600 transition-all disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── INVENTORY TAB ───────────────────────────────────────────────── */

function InventoryTab({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  // Add form state
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newQty, setNewQty] = useState("0");
  const [newMin, setNewMin] = useState("5");
  const [newCost, setNewCost] = useState("0");
  const [newCat, setNewCat] = useState("General");

  const load = useCallback(async () => {
    try {
      const data = await staffFetch(
        `/api/restaurants/${restaurantId}/inventory`,
      );
      setItems(data || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async () => {
    if (!newName.trim()) return;
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/inventory`, {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit,
          quantity: parseFloat(newQty) || 0,
          minStock: parseFloat(newMin) || 5,
          costPerUnit: parseFloat(newCost) || 0,
          category: newCat || "General",
        }),
      });
      setNewName("");
      setNewQty("0");
      setNewCost("0");
      setShowAdd(false);
      load();
    } catch {
      /* ignore */
    }
  };

  const updateQty = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQuantity = Math.max(0, item.quantity + delta);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/inventory/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: newQuantity }),
      });
      load();
    } catch {
      /* ignore */
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/inventory/${id}`, {
        method: "DELETE",
      });
      load();
    } catch {
      /* ignore */
    }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const lowStock = items.filter((i) => i.quantity <= i.minStock);
  const categories = [...new Set(items.map((i) => i.category))];

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 shadow-[0_2px_12px_rgba(239,68,68,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold text-red-700">
              {lowStock.length} item(s) low on stock
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStock.map((i) => (
              <span
                key={i.id}
                className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-100"
              >
                {i.name}: {i.quantity} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-400 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4 overflow-hidden"
          >
            <h4 className="text-sm font-bold text-[#3e1e0c]">Add Stock Item</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Item Name *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Basmati Rice"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Unit
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 w-full"
                >
                  {[
                    "kg",
                    "g",
                    "litre",
                    "ml",
                    "pcs",
                    "packs",
                    "dozen",
                    "bottle",
                  ].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Min Stock Alert
                </label>
                <input
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                  placeholder="5"
                  type="number"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Cost per Unit
                </label>
                <input
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="col-span-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 w-full"
                >
                  {[
                    "General",
                    "Vegetables",
                    "Fruits",
                    "Spices",
                    "Meat",
                    "Dairy",
                    "Grains",
                    "Oils",
                    "Beverages",
                    "Packaging",
                    "Cleaning",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addItem}
                disabled={!newName.trim()}
                className="rounded-xl bg-brand-400 px-5 py-2 text-xs font-bold text-white hover:bg-brand-500 disabled:bg-gray-300"
              >
                Add Item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items grouped by category */}
      {categories.map((cat) => {
        const catItems = filtered.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {cat}
            </h4>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-2xl bg-white border border-l-4 p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 ${
                    item.quantity <= item.minStock
                      ? "border-red-200 border-l-red-400 bg-red-50/30"
                      : "border-gray-100 border-l-emerald-400"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-[#3e1e0c] truncate">
                      {item.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-bold ${item.quantity <= item.minStock ? "text-red-600" : "text-gray-500"}`}
                      >
                        {item.quantity} {item.unit}
                      </span>
                      {item.costPerUnit > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {formatPrice(item.costPerUnit, currency)}/{item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
                    >
                      <Minus className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold text-[#3e1e0c]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400 hover:bg-brand-500 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-all ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <Package className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-500">No stock items yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add ingredients and supplies to track stock levels
          </p>
        </div>
      )}
    </div>
  );
}

/* ── MAIN PAGE ───────────────────────────────────────────────────── */

export default function KitchenPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("orders");

  // Update active tab to role default on session load
  useEffect(() => {
    if (session) {
      const role = session.role || "CASHIER";
      const tabs = ALL_TABS.filter((tab) => tab.roles.includes(role));
      if (role === "CASHIER" && tabs.some((t) => t.id === "billing")) {
        setActiveTab("billing");
      }
    }
  }, [session]);

  // Staff Profile & Attendance State
  const [showProfile, setShowProfile] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // PIN Change State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeStatus, setPinChangeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [pinErrorMsg, setPinErrorMsg] = useState("");

  const loadAttendance = useCallback(async () => {
    try {
      const { record } = await staffFetch("/api/staff/attendance");
      setIsPunchedIn(!!record && !record.checkOut);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/staff-session")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSession(data);
        loadAttendance();
      })
      .catch(() => router.push("/staff-login"))
      .finally(() => setLoading(false));
  }, [router, loadAttendance]);

  const handlePunch = async () => {
    setAttendanceLoading(true);
    try {
      const action = isPunchedIn ? "PUNCH_OUT" : "PUNCH_IN";
      await staffFetch("/api/staff/attendance", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await loadAttendance();
    } catch (e: any) {
      showToast(e.message || "Failed to punch", "error");
    }
    setAttendanceLoading(false);
  };

  const handlePinChange = async () => {
    if (newPin.length !== 4) return setPinErrorMsg("New PIN must be 4 digits");
    setPinChangeStatus("loading");
    try {
      await staffFetch("/api/staff/profile/pin", {
        method: "PATCH",
        body: JSON.stringify({ currentPin, newPin }),
      });
      setPinChangeStatus("success");
      setCurrentPin("");
      setNewPin("");
      setTimeout(() => setPinChangeStatus("idle"), 3000);
    } catch (e: any) {
      setPinChangeStatus("error");
      setPinErrorMsg(e.message || "Failed to change PIN");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/staff-session", { method: "DELETE" });
    router.push("/staff-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const roleKey = session.role || "CASHIER";
  const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.CASHIER;

  // Filter tabs based on staff role
  const baseTabs = ALL_TABS.filter((tab) => tab.roles.includes(roleKey));

  // Add type-specific feature tabs (available to SUPER_ADMIN and MANAGER)
  const featureTabs = getFeatureTabsForType(session.restaurantType || "RESTAURANT");
  const featureTabItems = (roleKey === "SUPER_ADMIN" || roleKey === "MANAGER")
    ? featureTabs.map((f) => ({
        id: f.id as TabId,
        label: f.label,
        icon: ClipboardList,
        roles: ["SUPER_ADMIN", "MANAGER"],
      }))
    : [];

  const TABS = [...baseTabs, ...featureTabItems];

  // Default tab based on role
  const defaultTab = roleKey === "CASHIER" ? "billing" : "orders";

  return (
    <div className="min-h-screen bg-brand-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl shadow-[0_1px_12px_rgba(0,0,0,0.06)] border-b border-brand-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-brand-400" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-[#3e1e0c]">
                Hima<span className="text-brand-400">Volt</span>
              </span>
              <span
                className={`ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${config.color} ${config.bg}`}
              >
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                onClick={handlePunch}
                disabled={attendanceLoading}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                  isPunchedIn
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                {attendanceLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPunchedIn ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isPunchedIn ? "Punched In" : "Punch In"}
                </span>
              </button>

              <a
                href="/counter"
                className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-all"
              >
                <CreditCard className="h-3 w-3" />
                <span className="hidden sm:inline">Counter</span>
              </a>

              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{session.name}</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Staff Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-[#3e1e0c]">
                  Staff Profile
                </h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.bg} ${config.color}`}
                  >
                    <config.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#3e1e0c]">
                      {session.name}
                    </h3>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-[#3e1e0c]">
                    Change Access PIN
                  </h4>
                  <input
                    type="password"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Current PIN (4 digits)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN (4 digits)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />

                  {pinChangeStatus === "error" && (
                    <p className="text-xs text-red-500 font-medium">
                      {pinErrorMsg}
                    </p>
                  )}
                  {pinChangeStatus === "success" && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> PIN updated successfully
                    </p>
                  )}

                  <button
                    onClick={handlePinChange}
                    disabled={
                      currentPin.length !== 4 ||
                      newPin.length !== 4 ||
                      pinChangeStatus === "loading"
                    }
                    className="w-full rounded-xl bg-brand-400 py-2.5 text-sm font-bold text-white hover:bg-brand-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                  >
                    {pinChangeStatus === "loading" ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      "Update PIN"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl border-b border-brand-100/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div
            className="flex gap-1 overflow-x-auto py-2.5"
            style={{ scrollbarWidth: "none" }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="kitchen-tab-pill"
                      className="absolute inset-0 rounded-xl bg-brand-400 shadow-md shadow-brand-400/20"
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <Icon className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "orders" && (
              <OrdersTab restaurantId={session.restaurantId} currency={session.currency ?? "NPR"} />
            )}
            {activeTab === "billing" && (
              <BillingTab
                restaurantId={session.restaurantId}
                staffRole={session.role}
              />
            )}
            {activeTab === "menu" && (
              <MenuTab restaurantId={session.restaurantId} currency={session.currency ?? "NPR"} />
            )}
            {activeTab === "chat" && (
              <ChatTab
                restaurantId={session.restaurantId}
                staffRole={session.role}
                staffName={session.name}
              />
            )}
            {activeTab === "inventory" && (
              <InventoryTab restaurantId={session.restaurantId} currency={session.currency ?? "NPR"} />
            )}
            {activeTab === "stories" && (
              <StoryManager
                restaurantId={session.restaurantId}
                staffRole={session.role}
              />
            )}
            {activeTab === "media" && <MediaTab restaurantId={session.restaurantId} />}
            {/* Type-specific feature tabs */}
            {(() => {
              const FeatureComponent = STAFF_FEATURE_COMPONENTS[activeTab as FeatureTabId];
              if (!FeatureComponent) return null;
              return <FeatureComponent />;
            })()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
