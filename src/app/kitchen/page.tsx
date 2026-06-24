"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
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
  Monitor,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import KitchenBoard from "@/components/kitchen/KitchenBoard";
import {
  getFeatureTabsForType,
  type FeatureTabId,
} from "@/lib/restaurant-types";
import { KITCHEN_VISIBLE_FEATURES } from "@/lib/staff-roles";

const StaffTabLoader = () => (
  <div className="flex min-h-[260px] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
  </div>
);

const lazyStaffTab = <T,>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
) => dynamic(loader, { loading: StaffTabLoader, ssr: false });

const BillingTab = lazyStaffTab(() => import("@/components/billing/BillingTab"));
const StoryManager = lazyStaffTab(() => import("@/components/stories/StoryManager"));
const ThemeToggle = dynamic(() => import("@/components/shared/ThemeToggle"), {
  ssr: false,
});
const GlobalChatButton = dynamic(
  () => import("@/components/chat/GlobalChatButton"),
  { ssr: false },
);
const MediaTab = lazyStaffTab(() => import("@/components/dashboard/MediaTab"));
const TablesTab = lazyStaffTab(() => import("@/components/dashboard/TablesTab"));
const ManualBillingTab = lazyStaffTab(
  () => import("@/components/dashboard/ManualBillingTab"),
);
const WaiterOrderTab = lazyStaffTab(
  () => import("@/components/dashboard/WaiterOrderTab"),
);
const RoomManagementTab = lazyStaffTab(
  () => import("@/components/dashboard/RoomManagementTab"),
);
const HotelBookingsTab = lazyStaffTab(
  () => import("@/components/dashboard/HotelBookingsTab"),
);
const HotelQRTab = lazyStaffTab(() => import("@/components/dashboard/HotelQRTab"));
const RoomQRTab = lazyStaffTab(() => import("@/components/dashboard/RoomQRTab"));
const GuestCheckInTab = lazyStaffTab(
  () => import("@/components/dashboard/GuestCheckInTab"),
);
const QuickCounterTab = lazyStaffTab(
  () => import("@/components/dashboard/features/QuickCounterTab"),
);
const ComboMealsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/ComboMealsTab"),
);
const RushHourTab = lazyStaffTab(
  () => import("@/components/dashboard/features/RushHourTab"),
);
const TakeawayTab = lazyStaffTab(
  () => import("@/components/dashboard/features/TakeawayTab"),
);
const RoomServiceTab = lazyStaffTab(
  () => import("@/components/dashboard/features/RoomServiceTab"),
);
const MultiOutletTab = lazyStaffTab(
  () => import("@/components/dashboard/features/MultiOutletTab"),
);
const EventCateringTab = lazyStaffTab(
  () => import("@/components/dashboard/features/EventCateringTab"),
);
const GuestBillingTab = lazyStaffTab(
  () => import("@/components/dashboard/features/GuestBillingTab"),
);
const BuffetManagerTab = lazyStaffTab(
  () => import("@/components/dashboard/features/BuffetManagerTab"),
);
const PreOrdersTab = lazyStaffTab(
  () => import("@/components/dashboard/features/PreOrdersTab"),
);
const CustomCakesTab = lazyStaffTab(
  () => import("@/components/dashboard/features/CustomCakesTab"),
);
const DailySpecialsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/DailySpecialsTab"),
);
const DisplayCounterTab = lazyStaffTab(
  () => import("@/components/dashboard/features/DisplayCounterTab"),
);
const DeliveryOpsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/DeliveryOpsTab"),
);
const MultiBrandTab = lazyStaffTab(
  () => import("@/components/dashboard/features/MultiBrandTab"),
);
const DeliveryZonesTab = lazyStaffTab(
  () => import("@/components/dashboard/features/DeliveryZonesTab"),
);
const PackageTrackingTab = lazyStaffTab(
  () => import("@/components/dashboard/features/PackageTrackingTab"),
);
const HappyHoursTab = lazyStaffTab(
  () => import("@/components/dashboard/features/HappyHoursTab"),
);
const TabManagementTab = lazyStaffTab(
  () => import("@/components/dashboard/features/TabManagementTab"),
);
const CocktailMenuTab = lazyStaffTab(
  () => import("@/components/dashboard/features/CocktailMenuTab"),
);
const LiveEventsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/LiveEventsTab"),
);
const LoyaltyRewardsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/LoyaltyRewardsTab"),
);
const WifiSeatingTab = lazyStaffTab(
  () => import("@/components/dashboard/features/WifiSeatingTab"),
);
const SeasonalMenuTab = lazyStaffTab(
  () => import("@/components/dashboard/features/SeasonalMenuTab"),
);
const BrunchModeTab = lazyStaffTab(
  () => import("@/components/dashboard/features/BrunchModeTab"),
);
const TableReservationsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/TableReservationsTab"),
);
const WaitlistTab = lazyStaffTab(
  () => import("@/components/dashboard/features/WaitlistTab"),
);
const PrivateDiningTab = lazyStaffTab(
  () => import("@/components/dashboard/features/PrivateDiningTab"),
);
const WifiSettingsTab = lazyStaffTab(
  () => import("@/components/dashboard/features/WifiSettingsTab"),
);

// Granular feature tabs surfaced in the staff kitchen portal. The consolidated
// `hotel-hub` tab is an owner-dashboard concept only — staff get the individual
// hotel sub-features (rooms, bookings, QR, etc.) — so it is intentionally absent
// here. The lookup below guards the missing-key case with `if (!FeatureComponent)`.
const STAFF_FEATURE_COMPONENTS: Partial<
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
  rooms: RoomManagementTab,
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
  featuresEnabled?: string[];
  featuresDisabled?: string[];
  posEnabled?: boolean;
  printKitchenWidth?: number;
  printAutoKOT?: boolean;
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

type TabId =
  | "orders"
  | "menu"
  | "chat"
  | "inventory"
  | "billing"
  | "stories"
  | "media"
  | "tables"
  | "manual"
  | "waiter-order"
  | FeatureTabId;

const ALL_TABS: {
  id: TabId;
  label: string;
  icon: typeof ClipboardList;
  roles: string[];
}[] = [
  {
    id: "waiter-order",
    label: "New Order",
    icon: Plus,
    roles: ["SUPER_ADMIN", "MANAGER", "WAITER"],
  },
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
  {
    id: "tables",
    label: "Tables",
    icon: Utensils,
    roles: ["SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER"],
  },
  {
    id: "manual",
    label: "Manual Order",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "MANAGER", "CASHIER"],
  },
];

const STATUS_ORDER = ["PENDING", "ACCEPTED", "ACCEPTED", "ACCEPTED", "ACCEPTED"];

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
    color: "text-[#b25c1c]",
    bg: "bg-[var(--accent-muted)]",
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

async function staffFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

function MenuTab({
  restaurantId,
  currency,
}: {
  restaurantId: string;
  currency: string;
}) {
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all shadow-sm"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
            <UtensilsCrossed className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-[var(--text-2)]">No items found</p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Try a different search term
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200"
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
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${item.isVeg ? "bg-[#eaa94d]" : "bg-red-500"}`}
                />
                <h4 className="text-sm font-bold text-[var(--text-1)] truncate">
                  {item.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[var(--text-2)]">
                  {formatPrice(item.price, currency)}
                </span>
                <span className="text-[10px] text-[var(--text-3)]">
                  {item.category?.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleAvailability(item.id, item.isAvailable)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                item.isAvailable
                  ? "bg-[var(--accent-muted)] text-[#b25c1c] hover:bg-[var(--accent-muted)]"
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
        <div className="rounded-xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] p-2 mb-2 flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-[var(--text-3)]" />
          <span className="text-xs font-bold text-[var(--text-2)]">
            Order #{room?.order?.orderNo || "?"}
            {room?.order?.tableNo ? ` · Table ${room.order.tableNo}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eaa94d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#eaa94d]" />
            </span>
            <span className="text-[10px] text-[#b25c1c] font-bold">Live</span>
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
                    : "bg-[var(--canvas)] border border-[var(--border)] text-[var(--text-1)] rounded-bl-md"
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
            <p className="text-center text-xs text-[var(--text-3)] py-10">
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
            className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-all"
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
      <div className="flex gap-2">
        <button
          onClick={() => setTab("customers")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
            tab === "customers"
              ? "bg-brand-400 text-white"
              : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-gray-200"
          }`}
        >
          Customer Chats {rooms.length > 0 && `(${rooms.length})`}
        </button>
        <button
          onClick={() => setTab("broadcast")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
            tab === "broadcast"
              ? "bg-brand-500 text-white"
              : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-gray-200"
          }`}
        >
          Staff Broadcast
        </button>
      </div>

      {tab === "customers" && (
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-bold text-[var(--text-2)]">No active chats</p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                Chats appear when customers message about their order
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => openRoom(room.id)}
                className="w-full flex items-center gap-3 rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-400 shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-1)]">
                    Order #{room.order?.orderNo}
                    {room.order?.tableNo ? ` · T${room.order.tableNo}` : ""}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] truncate">
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
                        : "bg-[var(--canvas)] border border-[var(--border)] text-[var(--text-1)] rounded-bl-md"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-[10px] font-bold text-[var(--text-2)] mb-0.5">
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
              <p className="text-center text-xs text-[var(--text-3)] py-10">
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
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-all"
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

function InventoryTab({
  restaurantId,
  currency,
}: {
  restaurantId: string;
  currency: string;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

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
                className="rounded-lg bg-[var(--canvas)] px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-100"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-400 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4 overflow-hidden"
          >
            <h4 className="text-sm font-bold text-[var(--text-1)]">
              Add Stock Item
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Item Name *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Basmati Rice"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Unit
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400 w-full"
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
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Min Stock Alert
                </label>
                <input
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                  placeholder="5"
                  type="number"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Cost per Unit
                </label>
                <input
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="col-span-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-brand-400 w-full"
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
                className="rounded-xl px-4 py-2 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
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

      {categories.map((cat) => {
        const catItems = filtered.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <h4 className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
              {cat}
            </h4>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-2xl bg-[var(--canvas)] border border-l-4 p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 ${
                    item.quantity <= item.minStock
                      ? "border-red-200 border-l-red-400 bg-red-50/30"
                      : "border-[var(--border-soft)] border-l-emerald-400"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-[var(--text-1)] truncate">
                      {item.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-bold ${item.quantity <= item.minStock ? "text-red-600" : "text-[var(--text-2)]"}`}
                      >
                        {item.quantity} {item.unit}
                      </span>
                      {item.costPerUnit > 0 && (
                        <span className="text-[10px] text-[var(--text-3)]">
                          {formatPrice(item.costPerUnit, currency)}/{item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] hover:bg-gray-200 transition-all"
                    >
                      <Minus className="h-3.5 w-3.5 text-[var(--text-2)]" />
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold text-[var(--text-1)]">
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
                      <Trash2 className="h-3.5 w-3.5 text-[var(--text-3)] hover:text-red-500" />
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
            <Package className="h-8 w-8 text-gray-300" />
          </div>
          <p className="font-bold text-[var(--text-2)]">No stock items yet</p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Add ingredients and supplies to track stock levels
          </p>
        </div>
      )}
    </div>
  );
}

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

  // Warm the New Order menu/categories/tables caches as soon as the terminal
  // has a session, so opening "New Order" (WaiterOrderTab) paints from cache
  // instead of cold-fetching the menu. The owner dashboard warms these too;
  // the staff terminal didn't, which is why the waiter saw a blank menu.
  useEffect(() => {
    const rid = session?.restaurantId;
    if (!rid) return;
    const t = setTimeout(() => {
      apiFetch(`/api/restaurants/${rid}/menu`, { cacheTtl: 120_000 }).catch(() => {});
      apiFetch(`/api/restaurants/${rid}/categories`, { cacheTtl: 120_000 }).catch(() => {});
      apiFetch(`/api/restaurants/${rid}/tables`, { cacheTtl: 60_000 }).catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [session?.restaurantId]);

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
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
          <p className="text-sm font-medium text-[var(--text-2)]">
            Loading portal...
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const roleKey = session.role || "CASHIER";
  const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.CASHIER;

  // Filter tabs based on staff role
  const baseTabs = ALL_TABS.filter((tab) => tab.roles.includes(roleKey));

  // Add type-specific feature tabs:
  // - SUPER_ADMIN / MANAGER: all feature tabs for the restaurant type
  // - CHEF / WAITER: only kitchen-safe features (order-focused, no billing)
  // - CASHIER: handled via billing tab + feature tabs for SUPER_ADMIN/MANAGER above
  const featureTabs = getFeatureTabsForType(
    session.restaurantType || "RESTAURANT",
    {
      featuresEnabled: session.featuresEnabled,
      featuresDisabled: session.featuresDisabled,
    },
  );
  const featureTabItems = (() => {
    if (roleKey === "SUPER_ADMIN" || roleKey === "MANAGER") {
      return featureTabs.map((f) => ({
        id: f.id as TabId,
        label: f.label,
        icon: ClipboardList,
        roles: ["SUPER_ADMIN", "MANAGER"],
      }));
    }
    if (roleKey === "CHEF" || roleKey === "WAITER") {
      return featureTabs
        .filter((f) => KITCHEN_VISIBLE_FEATURES.has(f.id))
        .map((f) => ({
          id: f.id as TabId,
          label: f.label,
          icon: ClipboardList,
          roles: ["CHEF", "WAITER"],
        }));
    }
    return [];
  })();

  const TABS = [...baseTabs, ...featureTabItems];

  // Default tab based on role
  const defaultTab = roleKey === "CASHIER" ? "billing" : "orders";

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-1)] transition-colors">
      <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-2xl shadow-sm border-b border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-brand-400" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-[var(--text-1)]">
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
                    ? "bg-[var(--accent-muted)] text-[#b25c1c] hover:bg-[var(--accent-muted)]"
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

              {session.posEnabled && roleKey !== "CHEF" && (
                <a
                  href="/pos/staff"
                  className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                >
                  <Monitor className="h-3 w-3" />
                  <span className="hidden sm:inline">POS</span>
                </a>
              )}

              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:border-gray-300 transition-all shadow-sm"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{session.name}</span>
              </button>

              <ThemeToggle />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-[var(--text-1)]">
                  Staff Profile
                </h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="rounded-full bg-[var(--surface)] p-2 text-[var(--text-2)] hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-4 rounded-2xl bg-[var(--canvas-sub)] p-4 border border-[var(--border-soft)]">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.bg} ${config.color}`}
                  >
                    <config.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-1)]">
                      {session.name}
                    </h3>
                    <p className="text-xs text-[var(--text-2)]">
                      {config.label}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-soft)] p-4 space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-1)]">
                    Change Access PIN
                  </h4>
                  <input
                    type="password"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Current PIN (4 digits)"
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN (4 digits)"
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />

                  {pinChangeStatus === "error" && (
                    <p className="text-xs text-red-500 font-medium">
                      {pinErrorMsg}
                    </p>
                  )}
                  {pinChangeStatus === "success" && (
                    <p className="text-xs text-[#b25c1c] font-medium flex items-center gap-1">
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

      <div className="sticky top-16 z-40 bg-[var(--canvas)]/80 backdrop-blur-2xl border-b border-[var(--border)] pt-3 pb-2 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {(() => {
              const FOH_TAB_IDS: TabId[] = [
                "waiter-order",
                "tables",
                "billing",
                "manual",
                "chat",
                "stories",
                "media",
              ];
              const BOH_TAB_IDS: TabId[] = ["orders", "menu", "inventory"];
              const hasFOH = TABS.some((t) => FOH_TAB_IDS.includes(t.id));
              const hasBOH = TABS.some((t) => BOH_TAB_IDS.includes(t.id));
              const showGroups = hasFOH && hasBOH;

              const elements: React.ReactNode[] = [];
              let lastGroup: "foh" | "boh" | "other" | null = null;

              TABS.forEach((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const group = FOH_TAB_IDS.includes(tab.id)
                  ? "foh"
                  : BOH_TAB_IDS.includes(tab.id)
                    ? "boh"
                    : "other";

                // Category Dividers
                if (showGroups && lastGroup && lastGroup !== group && group !== "other") {
                  elements.push(
                    <div
                      key={`divider-${tab.id}`}
                      className="mx-2 flex shrink-0 items-center justify-center flex-col gap-1"
                    >
                      <div className="h-4 w-px bg-[var(--border)] rounded-full" />
                    </div>
                  );
                }
                lastGroup = group;

                elements.push(
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-300 ${
                      isActive
                        ? "text-white"
                        : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="kitchen-tab-pill-revamped"
                        className="absolute inset-0 rounded-full bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30 border border-white/10 dark:border-white/5"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                    <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              });
              return elements;
            })()}
          </div>
        </div>
      </div>

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
              <KitchenBoard
                restaurantId={session.restaurantId}
                currency={session.currency ?? "NPR"}
                restaurantName={session.restaurantName}
                kitchenWidth={session.printKitchenWidth ?? 80}
                autoPrintKOT={session.printAutoKOT ?? false}
              />
            )}
            {activeTab === "billing" && (
              <BillingTab
                restaurantId={session.restaurantId}
                staffRole={session.role}
                currency={session.currency ?? "NPR"}
              />
            )}
            {activeTab === "menu" && (
              <MenuTab
                restaurantId={session.restaurantId}
                currency={session.currency ?? "NPR"}
              />
            )}
            {activeTab === "chat" && (
              <ChatTab
                restaurantId={session.restaurantId}
                staffRole={session.role}
                staffName={session.name}
              />
            )}
            {activeTab === "inventory" && (
              <InventoryTab
                restaurantId={session.restaurantId}
                currency={session.currency ?? "NPR"}
              />
            )}
            {activeTab === "stories" && (
              <StoryManager
                restaurantId={session.restaurantId}
                staffRole={session.role}
              />
            )}
            {activeTab === "media" && (
              <MediaTab restaurantId={session.restaurantId} />
            )}
            {activeTab === "tables" && (
              <TablesTab
                restaurantId={session.restaurantId}
                currency={session.currency}
              />
            )}
            {activeTab === "manual" && (
              <ManualBillingTab
                restaurantId={session.restaurantId}
                currency={session.currency}
                restaurantName={session.restaurantName}
                restaurantAddress={session.restaurantAddress}
                restaurantPhone={session.restaurantPhone}
                taxRate={session.taxRate}
                taxEnabled={session.taxEnabled}
              />
            )}
            {activeTab === "waiter-order" && (
              <WaiterOrderTab restaurantId={session.restaurantId} />
            )}
            {/* Type-specific feature tabs */}
            {(() => {
              const FeatureComponent =
                STAFF_FEATURE_COMPONENTS[activeTab as FeatureTabId];
              if (!FeatureComponent) return null;
              const Comp = FeatureComponent as React.ComponentType<{
                restaurantId?: string;
              }>;
              return <Comp restaurantId={session.restaurantId} />;
            })()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global floating chat (only when NOT on chat tab to avoid duplicate) */}
      {activeTab !== "chat" && (
        <GlobalChatButton
          restaurantId={session.restaurantId}
          staffRole={session.role}
          staffName={session.name}
        />
      )}
    </div>
  );
}
