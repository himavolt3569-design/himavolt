"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  History,
  Heart,
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Truck,
  Package,
  Mountain,
  Star,
  Search,
  MapPin,
  ShoppingBag,
  Building2,
  TrendingUp,
  Receipt,
  Utensils,
  AtSign,
  Save,
  Loader2,
  Check,
  X,
  RefreshCw,
  HeartOff,
  Calendar,
  CreditCard,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/currency";

/* ── Brand ──────────────────────────────────────────────── */
const BRAND = "#eaa94d";

/* ── Types ──────────────────────────────────────────────── */
type Tab = "home" | "orders" | "favourites" | "account";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addOns?: string | null;
}
interface Order {
  id: string;
  orderNo: string;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  total: number;
  note?: string | null;
  createdAt: string;
  deliveryAddress?: string | null;
  deliveryFee: number;
  tableNo?: number | null;
  items: OrderItem[];
  payment?: { method: string; status: string; paidAt?: string | null } | null;
  bill?: {
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
    imageUrl?: string | null;
    currency: string;
  };
}

interface Stats {
  totalOrders: number;
  totalSpent: number;
  ratingsGiven: number;
  favoriteRestaurant: { name: string; imageUrl: string | null } | null;
}

interface Favourite {
  id: string;
  restaurantId: string;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    type: string;
    imageUrl?: string | null;
    rating: number;
    city: string;
    address: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    imageUrl?: string | null;
    slug: string;
    type: string;
  };
}

/* ── Helpers ────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  PENDING:   { label: "Pending",   color: "text-amber-700",  bg: "bg-amber-50",  icon: Clock },
  ACCEPTED:  { label: "Accepted",  color: "text-blue-700",   bg: "bg-blue-50",   icon: CheckCircle },
  PREPARING: { label: "Preparing", color: "text-purple-700", bg: "bg-purple-50", icon: ChefHat },
  READY:     { label: "Ready",     color: "text-emerald-700",bg: "bg-emerald-50",icon: Package },
  DELIVERED: { label: "Delivered", color: "text-green-700",  bg: "bg-green-50",  icon: Truck },
  CANCELLED: { label: "Cancelled", color: "text-red-700",    bg: "bg-red-50",    icon: XCircle },
  REJECTED:  { label: "Rejected",  color: "text-red-700",    bg: "bg-red-50",    icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  FAST_FOOD: "Fast Food",
  RESTAURANT: "Restaurant",
  CAFE: "Cafe",
  BAKERY: "Bakery",
  HOTEL: "Hotel",
  BAR: "Bar",
  CLOUD_KITCHEN: "Cloud Kitchen",
  RESORT: "Resort",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Stars Component ────────────────────────────────────── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  /* ── Data ── */
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch all data on mount ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ordersRes, statsRes, favsRes, reviewsRes] = await Promise.allSettled([
      fetch("/api/orders?limit=100").then((r) => r.json()),
      fetch("/api/me/stats").then((r) => r.json()),
      fetch("/api/me/favourites").then((r) => r.json()),
      fetch("/api/me/reviews").then((r) => r.json()),
    ]);
    if (ordersRes.status === "fulfilled") setOrders(ordersRes.value);
    if (statsRes.status === "fulfilled") setStats(statsRes.value);
    if (favsRes.status === "fulfilled" && Array.isArray(favsRes.value)) setFavourites(favsRes.value);
    if (reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value)) setReviews(reviewsRes.value);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── User info ── */
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "there";
  const firstName = displayName.split(" ")[0];
  const avatarUrl = user?.user_metadata?.avatar_url;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  /* ── Active order (most recent non-terminal) ── */
  const activeOrder = orders.find(
    (o) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status)
  );

  /* ── Tab config ── */
  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: History },
    { id: "favourites", label: "Saved", icon: Heart },
    { id: "account", label: "Account", icon: User },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
          <p className="mt-3 text-sm text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-transform active:scale-95">
            <Mountain className="h-5 w-5 text-brand-400" strokeWidth={2.5} />
            <span className="text-base font-extrabold text-[#3e1e0c]">
              Hima<span className="text-brand-400">Volt</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 active:scale-[0.97] transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            Explore
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pb-24 pt-5">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <TabPanel key="home">
              <HomeTab
                firstName={firstName}
                avatarUrl={avatarUrl}
                stats={stats}
                activeOrder={activeOrder}
                recentOrders={orders.slice(0, 4)}
                memberSince={memberSince}
                onViewOrders={() => setTab("orders")}
              />
            </TabPanel>
          )}
          {tab === "orders" && (
            <TabPanel key="orders">
              <OrdersTab orders={orders} />
            </TabPanel>
          )}
          {tab === "favourites" && (
            <TabPanel key="favourites">
              <FavouritesTab
                favourites={favourites}
                setFavourites={setFavourites}
              />
            </TabPanel>
          )}
          {tab === "account" && (
            <TabPanel key="account">
              <AccountTab
                user={user}
                displayName={displayName}
                avatarUrl={avatarUrl}
                memberSince={memberSince}
                stats={stats}
                reviews={reviews}
                signOut={signOut}
              />
            </TabPanel>
          )}
        </AnimatePresence>
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/60 bg-white/95 backdrop-blur-xl pb-safe">
        <div className="mx-auto flex max-w-2xl items-center justify-around h-14">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative flex flex-1 flex-col items-center justify-center h-full group"
              >
                {active && (
                  <motion.div
                    layoutId="dashboardNavActive"
                    className="absolute inset-x-2 top-1 bottom-1 bg-brand-400/8 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 mb-0.5 z-10 transition-all ${
                    active ? "text-brand-400" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                  fill={active && id === "favourites" ? "#eaa94d" : "none"}
                />
                <span
                  className={`text-[10px] font-semibold z-10 leading-none transition-all ${
                    active ? "text-brand-400" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── Tab Animation Wrapper ──────────────────────────────── */
function TabPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOME TAB
   ════════════════════════════════════════════════════════ */
function HomeTab({
  firstName,
  avatarUrl,
  stats,
  activeOrder,
  recentOrders,
  memberSince,
  onViewOrders,
}: {
  firstName: string;
  avatarUrl?: string;
  stats: Stats | null;
  activeOrder?: Order;
  recentOrders: Order[];
  memberSince: string;
  onViewOrders: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-400 shadow">
            {firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900">Hey, {firstName}!</h1>
          <p className="text-xs text-gray-400">What are you craving today?</p>
        </div>
      </div>

      {/* Active Order Tracker */}
      {activeOrder && <LiveOrderCard order={activeOrder} />}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={ShoppingBag}
            label="Orders"
            value={stats.totalOrders.toString()}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            icon={Wallet}
            label="Spent"
            value={`Rs. ${Math.round(stats.totalSpent).toLocaleString("en-IN")}`}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard
            icon={Star}
            label="Reviews"
            value={stats.ratingsGiven.toString()}
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>
      )}

      {/* Favourite Restaurant */}
      {stats?.favoriteRestaurant && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Most Ordered From</p>
          <div className="flex items-center gap-3">
            {stats.favoriteRestaurant.imageUrl ? (
              <img
                src={stats.favoriteRestaurant.imageUrl}
                alt=""
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Building2 className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {stats.favoriteRestaurant.name}
              </p>
              <p className="text-xs text-gray-400">Your favourite spot</p>
            </div>
            <TrendingUp className="ml-auto h-4 w-4 text-amber-400" />
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Recent Orders</h2>
            <button
              onClick={onViewOrders}
              className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} compact />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentOrders.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Utensils className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">No orders yet</p>
          <p className="text-xs text-gray-400 mb-4">Explore restaurants and place your first order!</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-brand-400 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
          >
            Browse Restaurants
          </Link>
        </div>
      )}

      {/* Member Since */}
      {memberSince && (
        <p className="text-center text-[11px] text-gray-300 pt-2">
          Member since {memberSince}
        </p>
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

/* ── Live Order Tracker ── */
function LiveOrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const steps = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="rounded-2xl border border-brand-400/15 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg}`}>
            <StatusIcon className={`h-4 w-4 ${meta.color}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Live Order #{order.orderNo}</p>
            <p className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">{timeAgo(order.createdAt)}</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-3">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-brand-400" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {order.restaurant.name} &middot; {order.items.length} item{order.items.length !== 1 ? "s" : ""}
        </p>
        <p className="text-xs font-bold text-gray-800">
          {formatPrice(order.total, order.restaurant.currency)}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORDERS TAB
   ════════════════════════════════════════════════════════ */
function OrdersTab({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.restaurant.name.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "PENDING", label: "Pending" },
    { id: "PREPARING", label: "Preparing" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Order History</h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-400/30 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === f.id
                ? "bg-brand-400 text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() =>
                setExpandedId(expandedId === order.id ? null : order.id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">
            {search || filter !== "all" ? "No matching orders" : "No orders yet"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Order Card ── */
function OrderCard({
  order,
  compact,
  expanded,
  onToggle,
}: {
  order: Order;
  compact?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const currency = order.restaurant.currency;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
        disabled={compact}
      >
        <div className="flex items-start gap-3">
          {/* Restaurant Image */}
          {order.restaurant.imageUrl ? (
            <img
              src={order.restaurant.imageUrl}
              alt=""
              className="h-11 w-11 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Utensils className="h-5 w-5 text-gray-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {order.restaurant.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  #{order.orderNo} &middot; {order.items.length} item{order.items.length !== 1 ? "s" : ""} &middot;{" "}
                  {timeAgo(order.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>

            {/* Item preview */}
            <p className="mt-1.5 text-xs text-gray-500 truncate">
              {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">
                {formatPrice(order.total, currency)}
              </p>
              {!compact && (
                <ChevronRight
                  className={`h-4 w-4 text-gray-300 transition-transform ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              {/* Items */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Items
                </p>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-600">
                      {item.quantity}x {item.name}
                      {item.addOns && (
                        <span className="text-gray-400"> + {item.addOns}</span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal, currency)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Tax</span>
                    <span>{formatPrice(order.tax, currency)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Delivery</span>
                    <span>{formatPrice(order.deliveryFee, currency)}</span>
                  </div>
                )}
                {order.bill?.serviceCharge ? (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Service Charge</span>
                    <span>{formatPrice(order.bill.serviceCharge, currency)}</span>
                  </div>
                ) : null}
                {order.bill?.discount ? (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.bill.discount, currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                  <span>Total</span>
                  <span>{formatPrice(order.total, currency)}</span>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(order.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                  {order.type === "DELIVERY" ? <Truck className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                  {order.type.replace("_", " ")}
                </span>
                {order.payment && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                    <CreditCard className="h-3 w-3" />
                    {order.payment.method}
                    {order.payment.status === "COMPLETED" && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </span>
                )}
                {order.tableNo && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                    Table {order.tableNo}
                  </span>
                )}
              </div>

              {order.deliveryAddress && (
                <div className="flex items-start gap-1.5 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {order.deliveryAddress}
                </div>
              )}

              {order.note && (
                <p className="text-xs text-gray-400 italic">&quot;{order.note}&quot;</p>
              )}

              {/* Reorder link */}
              {order.status === "DELIVERED" && (
                <Link
                  href={`/menu/${order.restaurant.slug}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 text-xs font-semibold text-brand-400 hover:bg-brand-100 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Order Again
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FAVOURITES TAB
   ════════════════════════════════════════════════════════ */
function FavouritesTab({
  favourites,
  setFavourites,
}: {
  favourites: Favourite[];
  setFavourites: React.Dispatch<React.SetStateAction<Favourite[]>>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  const removeFavourite = async (restaurantId: string) => {
    setRemoving(restaurantId);
    const res = await fetch(`/api/me/favourites?restaurantId=${restaurantId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFavourites((prev) => prev.filter((f) => f.restaurantId !== restaurantId));
    }
    setRemoving(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Saved Restaurants</h2>
        <span className="text-xs text-gray-400">{favourites.length} saved</span>
      </div>

      {favourites.length > 0 ? (
        <div className="space-y-3">
          {favourites.map((fav) => {
            const r = fav.restaurant;
            return (
              <motion.div
                key={fav.id}
                layout
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -100 }}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <Building2 className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/menu/${r.slug}`}
                      className="text-sm font-semibold text-gray-800 hover:text-brand-400 transition-colors"
                    >
                      {r.name}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {TYPE_LABELS[r.type] || r.type} &middot; {r.city}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {r.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {r.rating.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {r.address}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFavourite(r.id)}
                    disabled={removing === r.id}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-400 hover:bg-brand-100 transition-colors disabled:opacity-50"
                  >
                    {removing === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className="h-4 w-4 fill-brand-400" />
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
          <HeartOff className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">No saved restaurants</p>
          <p className="text-xs text-gray-400 mb-4">
            Tap the heart icon on any restaurant to save it here
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-brand-400 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
          >
            Explore Restaurants
          </Link>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ACCOUNT TAB
   ════════════════════════════════════════════════════════ */
function AccountTab({
  user,
  displayName,
  avatarUrl,
  memberSince,
  stats,
  reviews,
  signOut,
}: {
  user: any;
  displayName: string;
  avatarUrl?: string;
  memberSince: string;
  stats: Stats | null;
  reviews: Review[];
  signOut: () => Promise<void>;
}) {
  const [showReviews, setShowReviews] = useState(false);

  return (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg"
          />
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-400 shadow-lg ring-4 ring-white">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <h3 className="mt-3 text-base font-bold text-gray-900">{displayName}</h3>
        <p className="text-xs text-gray-400">{user?.email}</p>
        <span className="mt-2 inline-block rounded-full bg-brand-100 px-3 py-0.5 text-[10px] font-bold text-brand-400">
          Food Lover
        </span>
      </div>

      {/* Username Editor */}
      <UsernameEditor />

      {/* Quick Stats */}
      {stats && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Activity</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-900">{stats.totalOrders}</p>
              <p className="text-[10px] text-gray-400">Total Orders</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-900">
                Rs. {Math.round(stats.totalSpent).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-gray-400">Total Spent</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-900">{stats.ratingsGiven}</p>
              <p className="text-[10px] text-gray-400">Ratings Given</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-900">{memberSince.split(" ")[0]}</p>
              <p className="text-[10px] text-gray-400">Member Since {memberSince.split(" ")[1]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowReviews(!showReviews)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">
              My Reviews ({reviews.length})
            </span>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-gray-300 transition-transform ${showReviews ? "rotate-90" : ""}`}
          />
        </button>
        <AnimatePresence>
          {showReviews && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-start gap-3 py-2"
                    >
                      {review.restaurant.imageUrl ? (
                        <img
                          src={review.restaurant.imageUrl}
                          alt=""
                          className="h-9 w-9 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <Building2 className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">
                          {review.restaurant.name}
                        </p>
                        <Stars rating={review.rating} size={12} />
                        {review.comment && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {review.comment}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-300">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-gray-400">
                    No reviews yet. Order and share your experience!
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Links */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <AccountLink href="/orders" label="Order History" desc="View all your past orders" />
        <AccountLink href="/contact" label="Help & Support" desc="Get help with your account or orders" />
        <AccountLink href="/legal" label="Legal" desc="Privacy policy & terms of service" />
      </div>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>

      <p className="text-center text-[10px] text-gray-300 pb-4">HimaVolt v1.0</p>
    </div>
  );
}

/* ── Account Link ── */
function AccountLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-[11px] text-gray-400">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300" />
    </Link>
  );
}

/* ── Username Editor ── */
function UsernameEditor() {
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "saving" | "saved">("idle");
  const checkedRef = useRef("");
  const debouncedUsername = useDebounce(username, 400);

  /* Load current username */
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.username) {
          setUsername(d.username);
          setCurrentUsername(d.username);
        }
      })
      .catch(() => {});
  }, []);

  /* Check availability */
  useEffect(() => {
    const u = debouncedUsername;
    if (!u || u === currentUsername || checkedRef.current === u) return;
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setStatus(u.length < 3 ? "idle" : "invalid");
      return;
    }
    checkedRef.current = u;
    setStatus("checking");
    fetch(`/api/me/username-check?username=${encodeURIComponent(u)}`)
      .then((r) => r.json())
      .then(({ available }) => setStatus(available ? "available" : "taken"))
      .catch(() => setStatus("idle"));
  }, [debouncedUsername, currentUsername]);

  const handleChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setUsername(cleaned);
    if (cleaned === currentUsername) {
      setStatus("idle");
    } else {
      setStatus("idle");
      checkedRef.current = "";
    }
  };

  const handleSave = async () => {
    if (status !== "available") return;
    setStatus("saving");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      setCurrentUsername(username);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("taken");
    }
  };

  const changed = username !== currentUsername;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Username</p>
      <div className="relative">
        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={username}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="your_username"
          className={`w-full rounded-xl border py-2.5 pl-9 pr-20 text-sm focus:outline-none focus:ring-1 transition-colors ${
            status === "available"
              ? "border-green-400 focus:ring-green-200"
              : status === "taken" || status === "invalid"
              ? "border-red-400 focus:ring-red-200"
              : "border-gray-200 focus:border-brand-400/30 focus:ring-brand-400/30"
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {status === "available" && <Check className="h-4 w-4 text-green-500" />}
          {status === "saved" && (
            <span className="text-[10px] font-semibold text-green-600">Saved!</span>
          )}
          {changed && status === "available" && (
            <button
              onClick={handleSave}
              className="rounded-lg bg-brand-400 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-brand-600 transition-colors"
            >
              Save
            </button>
          )}
          {status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-brand-400" />}
        </div>
      </div>
      <p
        className={`mt-1 text-[10px] ${
          status === "available"
            ? "text-green-600"
            : status === "taken"
            ? "text-red-500"
            : status === "invalid"
            ? "text-red-500"
            : "text-gray-400"
        }`}
      >
        {status === "available" && "Username is available!"}
        {status === "taken" && "Username is already taken"}
        {status === "invalid" && "3-20 chars: lowercase, numbers, underscores"}
        {(status === "idle" || status === "checking" || status === "saving" || status === "saved") &&
          changed &&
          "3-20 chars: a-z, 0-9, underscores only"}
      </p>
    </div>
  );
}
