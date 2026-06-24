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
  Loader2,
  Check,
  RefreshCw,
  Calendar,
  CreditCard,
  Wallet,
  BedDouble,
  MessageSquare,
  Pencil,
  Send,
  Bike,
  UtensilsCrossed,
  Bookmark,
  BadgeCheck,
  Flame,
  Zap,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";
import Skeleton, {
  SkeletonOrderCard,
  SkeletonStatGrid,
} from "@/components/shared/Skeleton";

const BRAND = "#eaa94d";

type Tab = "home" | "orders" | "rewards" | "reviews" | "saved" | "account";

interface LoyaltyAccount {
  id: string;
  points: number;
  tier: string;
  totalSpent: number;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string | null;
    currency: string;
    type: string;
  };
}

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

interface HotelBooking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  advanceAmount: number;
  advancePaid: boolean;
  paymentStatus: string;
  status: string;
  adults: number;
  children: number;
  createdAt: string;
  room: {
    roomNumber: string;
    name: string | null;
    type: string;
    bedType: string | null;
    bedCount: number;
    imageUrls: string[];
  };
  restaurant: {
    name: string;
    slug: string;
    imageUrl: string | null;
    city: string;
    currency: string;
  };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  PENDING:   { label: "Pending",   color: "text-[var(--accent-text)]",   bg: "bg-[var(--accent-muted)]",   icon: Clock },
  ACCEPTED:  { label: "Accepted",  color: "text-blue-700",    bg: "bg-blue-50",    icon: CheckCircle },
  PREPARING: { label: "Preparing", color: "text-violet-700",  bg: "bg-violet-50",  icon: ChefHat },
  READY:     { label: "Ready",     color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]", icon: Package },
  DELIVERED: { label: "Delivered", color: "text-[var(--accent-text)]",   bg: "bg-[var(--accent-muted)]",   icon: Truck },
  CANCELLED: { label: "Cancelled", color: "text-red-700",     bg: "bg-red-50",     icon: XCircle },
  REJECTED:  { label: "Rejected",  color: "text-red-700",     bg: "bg-red-50",     icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  FAST_FOOD: "Fast Food", RESTAURANT: "Restaurant", CAFE: "Café",
  BAKERY: "Bakery", HOTEL: "Hotel", BAR: "Bar",
  CLOUD_KITCHEN: "Cloud Kitchen", RESORT: "Resort",
  MO_MO_SHOP: "Momo Shop", TANDOORI: "Tandoori", GUEST_HOUSE: "Guest House",
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
    month: "short", day: "numeric", year: "numeric",
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

function Stars({
  rating,
  size = 14,
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          onClick={() => interactive && onRate?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${interactive ? "cursor-pointer" : ""} ${
            s <= (interactive ? hover || rating : rating)
              ? "text-[var(--accent)] fill-[var(--accent)]"
              : "text-[var(--text-3)]"
          }`}
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

  const [orders, setOrders]           = useState<Order[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [favourites, setFavourites]   = useState<Favourite[]>([]);
  const [reviews, setReviews]         = useState<Review[]>([]);
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([]);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetchSecondaryData = useCallback(async () => {
    const [favsRes, reviewsRes, hotelRes, loyaltyRes] = await Promise.allSettled([
      apiFetch<Favourite[]>("/api/me/favourites"),
      apiFetch<Review[]>("/api/me/reviews"),
      apiFetch<HotelBooking[]>("/api/me/hotel-bookings"),
      apiFetch<{ accounts?: LoyaltyAccount[] }>("/api/me/loyalty"),
    ]);

    if (favsRes.status === "fulfilled" && Array.isArray(favsRes.value)) setFavourites(favsRes.value);
    if (reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value)) setReviews(reviewsRes.value);
    if (hotelRes.status === "fulfilled" && Array.isArray(hotelRes.value)) setHotelBookings(hotelRes.value);
    if (loyaltyRes.status === "fulfilled" && Array.isArray(loyaltyRes.value?.accounts)) setLoyaltyAccounts(loyaltyRes.value.accounts);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ordersRes, statsRes] = await Promise.allSettled([
      apiFetch<Order[]>("/api/orders?limit=100"),
      apiFetch<Stats>("/api/me/stats"),
    ]);
    if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
    if (statsRes.status === "fulfilled") setStats(statsRes.value);
    setLoading(false);
    window.setTimeout(fetchSecondaryData, 250);
  }, [fetchSecondaryData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayName  = user?.user_metadata?.full_name || user?.user_metadata?.name || "there";
  const firstName    = displayName.split(" ")[0];
  const avatarUrl    = user?.user_metadata?.avatar_url;
  const memberSince  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";
  const activeOrder  = orders.find((o) => !["ACCEPTED", "REJECTED", "REJECTED"].includes(o.status));
  const deliveryOrders = orders.filter((o) => o.type === "DELIVERY");

  const totalPoints = loyaltyAccounts.reduce((sum, a) => sum + a.points, 0);
  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: "home",    label: "Home",    icon: LayoutDashboard },
    { id: "orders",  label: "Orders",  icon: History,       badge: activeOrder ? 1 : 0 },
    { id: "rewards", label: "Rewards", icon: Gift,          badge: loyaltyAccounts.length > 0 ? loyaltyAccounts.length : 0 },
    { id: "saved",   label: "Saved",   icon: Heart,         badge: favourites.length > 0 ? favourites.length : 0 },
    { id: "account", label: "Account", icon: User },
  ];

  if (loading) {
    // Render the same shell that the populated dashboard uses so the user
    // sees structure (header, greeting, stat cards, order list) instantly
    // instead of a centered spinner while six endpoints fan out.
    return (
      <div className="flex min-h-screen flex-col bg-[#fdf9f3]">
        <header className="sticky top-0 z-40 bg-[var(--canvas)]/95 backdrop-blur-xl border-b border-[var(--accent)]/10 shadow-[0_1px_6px_rgba(234,169,77,0.06)]">
          <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-[var(--text-1)]">
                Hima<span className="text-[var(--accent)]">Volt</span>
              </span>
            </div>
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-6">
          {/* Greeting card */}
          <div className="rounded-3xl bg-[var(--canvas)] p-5 ring-1 ring-[var(--accent)]/10 space-y-3">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <SkeletonStatGrid count={2} className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-2" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonOrderCard key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fdf9f3]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[var(--canvas)]/95 backdrop-blur-xl border-b border-[var(--accent)]/10 shadow-[0_1px_6px_rgba(234,169,77,0.06)]">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-base font-extrabold tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-1)]/60 hover:text-[var(--text-1)] transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Explore
            </Link>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--accent-border)]" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[11px] font-bold text-[var(--accent)]">
                {firstName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 mx-auto w-full max-w-lg px-4 pb-24 pt-5">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <TabPanel key="home">
              <HomeTab
                firstName={firstName}
                avatarUrl={avatarUrl}
                stats={stats}
                activeOrder={activeOrder}
                recentOrders={orders.slice(0, 5)}
                deliveryOrders={deliveryOrders.slice(0, 3)}
                memberSince={memberSince}
                hotelBookings={hotelBookings}
                onViewOrders={() => setTab("orders")}
                onViewDelivery={() => setTab("orders")}
                onViewSaved={() => setTab("saved")}
                onViewReviews={() => setTab("reviews")}
              />
            </TabPanel>
          )}
          {tab === "orders" && (
            <TabPanel key="orders">
              <OrdersTab orders={orders} hotelBookings={hotelBookings} />
            </TabPanel>
          )}
          {tab === "rewards" && (
            <TabPanel key="rewards">
              <RewardsTab accounts={loyaltyAccounts} totalPoints={totalPoints} />
            </TabPanel>
          )}
          {tab === "reviews" && (
            <TabPanel key="reviews">
              <ReviewsTab
                reviews={reviews}
                setReviews={setReviews}
              />
            </TabPanel>
          )}
          {tab === "saved" && (
            <TabPanel key="saved">
              <SavedTab favourites={favourites} setFavourites={setFavourites} />
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
                signOut={signOut}
              />
            </TabPanel>
          )}
        </AnimatePresence>
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)]/60 bg-[var(--canvas)]/96 backdrop-blur-xl pb-safe">
        <div className="mx-auto flex max-w-lg items-center justify-around h-15">
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative flex flex-1 flex-col items-center justify-center h-full group gap-0.5"
              >
                {active && (
                  <motion.div
                    layoutId="customerNavPill"
                    className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl bg-[var(--accent-muted)]"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon
                    className={`h-5 w-5 transition-all ${active ? "text-[var(--accent)]" : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"}`}
                    strokeWidth={active ? 2.2 : 1.8}
                    fill={active && id === "saved" ? "#eaa94d" : "none"}
                  />
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] font-semibold z-10 transition-all ${active ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
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

function TabPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   ATTENDANCE BUTTON
   ════════════════════════════════════════════════════════ */
function AttendanceButton() {
  const today = new Date().toISOString().slice(0, 10);
  const lsKey = `checkin_${today}`;

  const [checked, setChecked] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(lsKey) === "1";
  });
  const [streak, setStreak] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("checkin_streak") || 0);
  });
  const [total, setTotal] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("checkin_total") || 0);
  });
  const [burst, setBurst] = useState(false);
  const [dots, setDots] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  // Sync from server on mount (silent, background)
  useEffect(() => {
    fetch("/api/me/check-in")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.checkedInToday) {
          setChecked(true);
          localStorage.setItem(lsKey, "1");
        }
        setStreak(data.streak);
        setTotal(data.total);
        localStorage.setItem("checkin_streak", String(data.streak));
        localStorage.setItem("checkin_total", String(data.total));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckIn = () => {
    if (checked) return;

    // Instant optimistic update
    setChecked(true);
    const newStreak = streak + 1;
    const newTotal = total + 1;
    setStreak(newStreak);
    setTotal(newTotal);
    localStorage.setItem(lsKey, "1");
    localStorage.setItem("checkin_streak", String(newStreak));
    localStorage.setItem("checkin_total", String(newTotal));

    // Burst animation
    setBurst(true);
    const colors = ["#eaa94d", "#f59e0b", "#fb923c", "#fbbf24", "#34d399"];
    const newDots = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.cos((i / 8) * 2 * Math.PI) * 38 + 50,
      y: Math.sin((i / 8) * 2 * Math.PI) * 38 + 50,
      color: colors[i % colors.length],
    }));
    setDots(newDots);
    setTimeout(() => { setBurst(false); setDots([]); }, 700);

    // Background persist
    fetch("/api/me/check-in", { method: "POST" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setStreak(data.streak);
        setTotal(data.total);
        localStorage.setItem("checkin_streak", String(data.streak));
        localStorage.setItem("checkin_total", String(data.total));
      })
      .catch(() => {});
  };

  const dayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Button */}
        <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
          {/* Burst dots */}
          {dots.map((dot) => (
            <motion.div
              key={dot.id}
              initial={{ opacity: 1, scale: 1, x: "50%", y: "50%" }}
              animate={{ opacity: 0, scale: 0, x: `${dot.x}%`, y: `${dot.y}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ backgroundColor: dot.color }}
              className="absolute w-2 h-2 rounded-full pointer-events-none"
            />
          ))}

          <motion.button
            onClick={handleCheckIn}
            disabled={checked}
            whileTap={!checked ? { scale: 0.88 } : {}}
            animate={burst ? { scale: [1, 1.18, 0.95, 1.04, 1] } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`relative w-full h-full rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors select-none ${
              checked
                ? "bg-[var(--accent-muted)] border-2 border-[var(--accent-border)] cursor-default"
                : "bg-[var(--accent)] active:bg-[#d4922a] shadow-md shadow-[var(--accent)]/30"
            }`}
          >
            <motion.div
              animate={burst ? { rotate: [0, -15, 15, -8, 0], scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {checked
                ? <Check className="h-6 w-6 text-[var(--accent-hover)]" strokeWidth={2.5} />
                : <Zap className="h-6 w-6 text-white" strokeWidth={2} fill="white" />
              }
            </motion.div>
            <span className={`text-[10px] font-bold leading-none ${checked ? "text-[var(--accent-hover)]" : "text-white"}`}>
              {checked ? "Done!" : "Check In"}
            </span>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--text-3)] mb-2">{dayLabel}</p>
          <div className="flex items-center gap-3">
            <motion.div
              key={streak}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="flex items-center gap-1"
            >
              <Flame className={`h-4 w-4 ${streak > 0 ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`} fill={streak > 0 ? "#fb923c" : "none"} />
              <span className="text-base font-extrabold text-[var(--text-1)]">{streak}</span>
              <span className="text-[10px] text-[var(--text-3)] font-medium">streak</span>
            </motion.div>
            <div className="w-px h-4 bg-[var(--surface)]" />
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <span className="text-sm font-bold text-[var(--text-2)]">{total}</span>
              <span className="text-[10px] text-[var(--text-3)] font-medium">total</span>
            </div>
          </div>

          {/* Streak bar */}
          <div className="mt-2.5 flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <motion.div
                key={day}
                initial={false}
                animate={{ scale: day <= streak ? 1 : 0.85, opacity: day <= streak ? 1 : 0.35 }}
                transition={{ delay: day * 0.03, type: "spring", stiffness: 400, damping: 20 }}
                className={`flex-1 h-1.5 rounded-full ${day <= streak ? "bg-[var(--accent)]" : "bg-[var(--surface)]"}`}
              />
            ))}
          </div>
          <p className="text-[9px] text-[var(--text-3)] mt-1">
            {streak >= 7 ? "7-day streak! " : streak > 0 ? `${7 - streak} more for a week` : "Check in daily to build a streak"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOME TAB
   ════════════════════════════════════════════════════════ */
function HomeTab({
  firstName, avatarUrl, stats, activeOrder, recentOrders,
  deliveryOrders, memberSince, hotelBookings,
  onViewOrders, onViewDelivery, onViewSaved, onViewReviews,
}: {
  firstName: string;
  avatarUrl?: string;
  stats: Stats | null;
  activeOrder?: Order;
  recentOrders: Order[];
  deliveryOrders: Order[];
  memberSince: string;
  hotelBookings: HotelBooking[];
  onViewOrders: () => void;
  onViewDelivery: () => void;
  onViewSaved: () => void;
  onViewReviews: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-1">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-md" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-base font-bold text-[var(--accent)] shadow">
            {firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xs text-[var(--text-3)] font-medium">{greeting},</p>
          <h1 className="text-lg font-extrabold text-[var(--text-1)] leading-tight">{firstName}!</h1>
        </div>
        {memberSince && (
          <div className="ml-auto flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 border border-[var(--accent-border)]">
            <BadgeCheck className="h-3 w-3 text-[var(--accent)]" />
            <span className="text-[9px] font-bold text-[var(--accent)]">Food Lover</span>
          </div>
        )}
      </div>

      <AttendanceButton />

      {activeOrder && <LiveOrderCard order={activeOrder} />}

      {stats && (
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={ShoppingBag} label="Orders" value={stats.totalOrders} color="blue" />
          <StatTile
            icon={Wallet}
            label="Spent"
            value={`Rs.${Math.round(stats.totalSpent / 1000)}k`}
            fullValue={`Rs. ${Math.round(stats.totalSpent).toLocaleString("en-IN")}`}
            color="emerald"
          />
          <StatTile icon={Star} label="Reviews" value={stats.ratingsGiven} color="amber" />
        </div>
      )}

      {stats?.favoriteRestaurant && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent)]/12 bg-[var(--canvas)] p-3.5 shadow-sm">
          {stats.favoriteRestaurant.imageUrl ? (
            <img src={stats.favoriteRestaurant.imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
              <Building2 className="h-5 w-5 text-[var(--accent)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">Most Ordered From</p>
            <p className="text-sm font-bold text-[var(--text-1)] truncate">{stats.favoriteRestaurant.name}</p>
          </div>
          <TrendingUp className="h-4 w-4 text-[var(--accent)] shrink-0" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: History, label: "Orders", action: onViewOrders, color: "bg-blue-50 text-blue-600" },
          { icon: Bike, label: "Delivery", action: onViewDelivery, color: "bg-violet-50 text-violet-600" },
          { icon: Star, label: "Reviews", action: onViewReviews, color: "bg-[var(--accent-muted)] text-[var(--accent-text)]" },
          { icon: Heart, label: "Saved", action: onViewSaved, color: "bg-red-50 text-red-500" },
        ].map(({ icon: Icon, label, action, color }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] py-3.5 shadow-sm hover:border-[var(--accent)]/20 transition-all active:scale-95"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-2)]">{label}</span>
          </button>
        ))}
      </div>

      {recentOrders.length > 0 && (
        <section>
          <SectionHeader title="Recent Orders" onAction={onViewOrders} actionLabel="See all" />
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <MiniOrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {deliveryOrders.length > 0 && (
        <section>
          <SectionHeader title="Delivery History" onAction={onViewDelivery} actionLabel="See all" />
          <div className="space-y-2.5">
            {deliveryOrders.slice(0, 2).map((order) => (
              <MiniOrderCard key={order.id} order={order} showAddress />
            ))}
          </div>
        </section>
      )}

      {hotelBookings.length > 0 && (
        <section>
          <SectionHeader title="Hotel Stays" actionLabel="See all" />
          <div className="space-y-2">
            {hotelBookings.slice(0, 1).map((b) => (
              <MiniStayCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {recentOrders.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--accent)]/20 bg-[#fdf9ef]/50 p-8 text-center">
          <Utensils className="mx-auto h-9 w-9 text-[var(--accent)]/30 mb-3" />
          <p className="text-sm font-bold text-[var(--text-2)] mb-1">No orders yet</p>
          <p className="text-xs text-[var(--text-3)] mb-4">Explore restaurants and place your first order!</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors"
          >
            Browse Restaurants
          </Link>
        </div>
      )}

      {memberSince && (
        <p className="text-center text-[10px] text-[var(--text-3)] pb-2">Member since {memberSince}</p>
      )}
    </div>
  );
}

function SectionHeader({
  title, onAction, actionLabel,
}: {
  title: string; onAction?: () => void; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-[var(--text-1)]">{title}</h2>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-0.5 text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          {actionLabel} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, fullValue, color,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string | number;
  fullValue?: string;
  color: "blue" | "emerald" | "amber";
}) {
  const colors = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600"    },
    emerald: { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]" },
    amber:   { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent)]" },
  }[color];

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-3 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${colors.bg}`}>
        <Icon className={`h-4 w-4 ${colors.text}`} strokeWidth={1.8} />
      </div>
      <p className="text-base font-extrabold text-[var(--text-1)] leading-tight" title={fullValue}>{value}</p>
      <p className="text-[10px] text-[var(--text-3)] mt-0.5">{label}</p>
    </div>
  );
}

function LiveOrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const steps = ["PENDING", "ACCEPTED", "ACCEPTED", "ACCEPTED", "ACCEPTED"];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[#fdf9ef] to-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg}`}>
            <StatusIcon className={`h-4 w-4 ${meta.color}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-1)]">Live · #{order.orderNo}</p>
            <p className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent)]">
          {timeAgo(order.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-3">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all ${i <= currentStep ? "bg-[var(--accent)]" : "bg-[var(--surface-alt)]"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-2)]">
          {order.restaurant.name} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
        </p>
        <p className="text-xs font-bold text-[var(--text-1)]">{formatPrice(order.total, order.restaurant.currency)}</p>
      </div>
    </div>
  );
}

function MiniOrderCard({ order, showAddress }: { order: Order; showAddress?: boolean }) {
  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)] p-3 shadow-sm">
      {order.restaurant.imageUrl ? (
        <img src={order.restaurant.imageUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
          <Utensils className="h-4.5 w-4.5 text-[var(--text-3)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-1)] truncate">{order.restaurant.name}</p>
        {showAddress && order.deliveryAddress ? (
          <p className="text-[11px] text-[var(--text-3)] truncate flex items-center gap-0.5">
            <MapPin className="h-3 w-3 shrink-0" />{order.deliveryAddress}
          </p>
        ) : (
          <p className="text-[11px] text-[var(--text-3)]">
            #{order.orderNo} · {timeAgo(order.createdAt)}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-[var(--text-1)]">{formatPrice(order.total, order.restaurant.currency)}</p>
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${meta.bg} ${meta.color}`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {meta.label}
        </span>
      </div>
    </div>
  );
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

function MiniStayCard({ booking }: { booking: HotelBooking }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)] p-3 shadow-sm">
      {booking.room.imageUrls[0] ? (
        <img src={booking.room.imageUrls[0]} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
          <BedDouble className="h-4 w-4 text-[var(--text-3)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-1)] truncate">{booking.restaurant.name}</p>
        <p className="text-[11px] text-[var(--text-3)]">{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)} · {booking.nights}N</p>
      </div>
      <p className="text-xs font-bold text-[var(--text-1)] shrink-0">
        Rs.{booking.totalPrice.toLocaleString()}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORDERS TAB  (Order History + Delivery History)
   ════════════════════════════════════════════════════════ */
function OrdersTab({
  orders,
  hotelBookings,
}: {
  orders: Order[];
  hotelBookings: HotelBooking[];
}) {
  type OrderFilter = "all" | "active" | "delivery" | "dine-in" | "stays";
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const FILTER_CHIPS: { id: OrderFilter; label: string; icon: typeof History }[] = [
    { id: "all",      label: "All",      icon: History },
    { id: "active",   label: "Active",   icon: Clock },
    { id: "delivery", label: "Delivery", icon: Bike },
    { id: "dine-in",  label: "Dine-in",  icon: UtensilsCrossed },
    { id: "stays",    label: "Stays",    icon: BedDouble },
  ];

  const filteredOrders = orders.filter((o) => {
    if (filter === "active" && ["ACCEPTED", "REJECTED", "REJECTED"].includes(o.status)) return false;
    if (filter === "delivery" && o.type !== "DELIVERY") return false;
    if (filter === "dine-in" && o.type === "DELIVERY") return false;
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

  const showStays = filter === "stays";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-1)]">Order History</h2>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{orders.length} total orders</p>
      </div>

      {!showStays && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by restaurant or item…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
          />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_CHIPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === id
                ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/30"
                : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--border)]"
            }`}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {showStays ? (
        hotelBookings.length === 0 ? (
          <EmptyState icon={BedDouble} title="No hotel stays yet" desc="Book a room from any hotel's page." />
        ) : (
          <div className="space-y-3">
            {hotelBookings.map((b) => <HotelStayCard key={b.id} booking={b} />)}
          </div>
        )
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={search || filter !== "all" ? "No matching orders" : "No orders yet"}
          desc={filter === "delivery" ? "You haven't placed any delivery orders yet." : ""}
        />
      ) : (
        <div className="space-y-3">
          {filter === "delivery" && (
            <div className="flex items-center gap-2 px-1">
              <Bike className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-bold text-[var(--text-2)]">{filteredOrders.length} Delivery Order{filteredOrders.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: typeof Receipt; title: string; desc?: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-12 text-center">
      <Icon className="mx-auto h-9 w-9 text-[var(--text-3)] mb-3" />
      <p className="text-sm font-semibold text-[var(--text-2)]">{title}</p>
      {desc && <p className="text-xs text-[var(--text-3)] mt-1">{desc}</p>}
    </div>
  );
}

function OrderCard({
  order, expanded, onToggle,
}: {
  order: Order;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const currency = order.restaurant.currency;

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          {order.restaurant.imageUrl ? (
            <img src={order.restaurant.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
              <Utensils className="h-5 w-5 text-[var(--text-3)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[var(--text-1)] truncate">{order.restaurant.name}</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  #{order.orderNo} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {timeAgo(order.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-2)] truncate">
              {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--text-1)]">{formatPrice(order.total, currency)}</p>
              <div className="flex items-center gap-1">
                {order.type === "DELIVERY" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-600">
                    <Bike className="h-2.5 w-2.5" /> Delivery
                  </span>
                )}
                <ChevronRight className={`h-4 w-4 text-[var(--text-3)] transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-soft)] px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Items</p>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-[var(--text-2)]">
                      {item.quantity}× {item.name}
                      {item.addOns && <span className="text-[var(--text-3)]"> +{item.addOns}</span>}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-2)]">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-[var(--border)] pt-2 space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-2)]">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal, currency)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-2)]">
                    <span>Tax</span><span>{formatPrice(order.tax, currency)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-2)]">
                    <span>Delivery Fee</span><span>{formatPrice(order.deliveryFee, currency)}</span>
                  </div>
                )}
                {order.bill?.serviceCharge ? (
                  <div className="flex justify-between text-xs text-[var(--text-2)]">
                    <span>Service Charge</span><span>{formatPrice(order.bill.serviceCharge, currency)}</span>
                  </div>
                ) : null}
                {order.bill?.discount ? (
                  <div className="flex justify-between text-xs text-[var(--accent-text)]">
                    <span>Discount</span><span>-{formatPrice(order.bill.discount, currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-bold text-[var(--text-1)] pt-1">
                  <span>Total</span><span>{formatPrice(order.total, currency)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2 py-1 text-[10px] font-medium text-[var(--text-2)]">
                  <Calendar className="h-3 w-3" />{formatDate(order.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2 py-1 text-[10px] font-medium text-[var(--text-2)]">
                  {order.type === "DELIVERY" ? <Truck className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                  {order.type.replace("_", " ")}
                </span>
                {order.payment && (
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium ${order.payment.status === "COMPLETED" ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "bg-[var(--accent-muted)] text-[var(--accent-text)]"}`}>
                    <CreditCard className="h-3 w-3" />{order.payment.method}
                  </span>
                )}
                {order.tableNo && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2 py-1 text-[10px] font-medium text-[var(--text-2)]">
                    Table {order.tableNo}
                  </span>
                )}
              </div>

              {order.deliveryAddress && (
                <div className="flex items-start gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-500" />
                  {order.deliveryAddress}
                </div>
              )}

              {order.note && (
                <p className="text-xs text-[var(--text-3)] italic">"{order.note}"</p>
              )}

              {order.status === "ACCEPTED" && (
                <Link
                  href={`/menu/${order.restaurant.slug}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-muted)] py-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Order Again
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BOOKING_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Awaiting Confirmation", color: "text-[var(--accent-text)]",   bg: "bg-[var(--accent-muted)]" },
  CONFIRMED:  { label: "Confirmed",             color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]" },
  CHECKED_IN: { label: "Checked In",            color: "text-blue-700",    bg: "bg-blue-50" },
  CHECKED_OUT:{ label: "Checked Out",           color: "text-[var(--text-2)]",    bg: "bg-[var(--surface)]" },
  CANCELLED:  { label: "Cancelled",             color: "text-red-700",     bg: "bg-red-50" },
};

function HotelStayCard({ booking }: { booking: HotelBooking }) {
  const meta = BOOKING_STATUS_META[booking.status] ?? BOOKING_STATUS_META.PENDING;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-sm">
      {booking.room.imageUrls[0] && (
        <img src={booking.room.imageUrls[0]} alt="Room" className="h-28 w-full object-cover" />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[var(--text-1)]">{booking.restaurant.name}</p>
            <p className="text-[11px] text-[var(--text-2)]">
              {booking.room.name || `Room ${booking.room.roomNumber}`} · {booking.room.type}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
          <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" />
          {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
          <span className="text-[var(--text-3)]">({booking.nights}N)</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[var(--accent-muted)] px-3 py-2">
          <span className="text-xs text-[var(--text-2)]">Total</span>
          <span className="text-sm font-bold text-[var(--accent)]">Rs.{booking.totalPrice.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className={`flex items-center gap-1 font-medium ${booking.advancePaid ? "text-[var(--accent-text)]" : "text-[var(--accent)]"}`}>
            <CreditCard className="h-3 w-3" />
            Advance {booking.advancePaid ? "Paid" : `Due · Rs.${booking.advanceAmount.toLocaleString()}`}
          </span>
          <a href={`/hotel/booking/${booking.id}`} className="font-semibold text-[var(--accent)] hover:underline">
            View Details →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REVIEWS TAB
   ════════════════════════════════════════════════════════ */
function ReviewsTab({
  reviews,
  setReviews,
}: {
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const startEdit = (review: Review) => {
    setEditing(review.restaurant.id);
    setEditRating(review.rating);
    setEditComment(review.comment ?? "");
    setSaveError("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditRating(0);
    setEditComment("");
    setSaveError("");
  };

  const saveEdit = async (restaurantId: string) => {
    if (!editRating) return;
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/me/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, rating: editRating, comment: editComment || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReviews((prev) =>
        prev.map((r) => (r.restaurant.id === restaurantId ? { ...r, rating: updated.rating, comment: updated.comment } : r))
      );
      cancelEdit();
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Failed to save review");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-1)]">My Reviews</h2>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{reviews.length} restaurant{reviews.length !== 1 ? "s" : ""} reviewed</p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-14 text-center">
          <MessageSquare className="mx-auto h-9 w-9 text-[var(--text-3)] mb-3" />
          <p className="text-sm font-bold text-[var(--text-2)] mb-1">No reviews yet</p>
          <p className="text-xs text-[var(--text-3)] mb-4">Order from a restaurant and share your experience!</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors"
          >
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isEditing = editing === review.restaurant.id;
            return (
              <motion.div
                key={review.id}
                layout
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  {review.restaurant.imageUrl ? (
                    <img src={review.restaurant.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
                      <Building2 className="h-5 w-5 text-[var(--text-3)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/menu/${review.restaurant.slug}`}
                      className="text-sm font-bold text-[var(--text-1)] hover:text-[var(--accent)] transition-colors"
                    >
                      {review.restaurant.name}
                    </Link>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {TYPE_LABELS[review.restaurant.type] || review.restaurant.type}
                    </p>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(review)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--canvas-sub)] text-[var(--text-3)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-2)] mb-1.5">Your Rating</p>
                      <Stars rating={editRating} size={24} interactive onRate={setEditRating} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-2)] mb-1.5">Comment (optional)</p>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                        placeholder="What did you think?"
                        className="w-full resize-none rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                      />
                    </div>
                    {saveError && (
                      <p className="text-xs text-red-500">{saveError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(review.restaurant.id)}
                        disabled={saving || !editRating}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] py-2 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {saving ? "Saving…" : "Save Review"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Stars rating={review.rating} size={16} />
                      <span className="text-[10px] text-[var(--text-3)]">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment ? (
                      <p className="text-sm text-[var(--text-2)] leading-relaxed">{review.comment}</p>
                    ) : (
                      <p className="text-xs text-[var(--text-3)] italic">No comment added</p>
                    )}
                    <Link
                      href={`/menu/${review.restaurant.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Visit restaurant <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SAVED TAB  (Favourites / Liked Restaurants)
   ════════════════════════════════════════════════════════ */
function SavedTab({
  favourites,
  setFavourites,
}: {
  favourites: Favourite[];
  setFavourites: React.Dispatch<React.SetStateAction<Favourite[]>>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const removeFavourite = async (restaurantId: string) => {
    setRemoving(restaurantId);
    const res = await fetch(`/api/me/favourites?restaurantId=${restaurantId}`, { method: "DELETE" });
    if (res.ok) setFavourites((prev) => prev.filter((f) => f.restaurantId !== restaurantId));
    setRemoving(null);
  };

  const filtered = favourites.filter((f) =>
    !search || f.restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
    f.restaurant.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-1)]">Saved Restaurants</h2>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{favourites.length} saved</p>
      </div>

      {favourites.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved restaurants…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
          />
        </div>
      )}

      {filtered.length === 0 && favourites.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-14 text-center">
          <Heart className="mx-auto h-9 w-9 text-[var(--text-3)] mb-3" />
          <p className="text-sm font-bold text-[var(--text-2)] mb-1">No saved restaurants</p>
          <p className="text-xs text-[var(--text-3)] mb-4">Tap the heart on any restaurant to save it here</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors"
          >
            Explore Restaurants
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((fav) => {
              const r = fav.restaurant;
              return (
                <motion.div
                  key={fav.id}
                  layout
                  exit={{ opacity: 0, x: -60 }}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-3.5 shadow-sm"
                >
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
                      <Building2 className="h-6 w-6 text-[var(--text-3)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/menu/${r.slug}`}
                      className="text-sm font-bold text-[var(--text-1)] hover:text-[var(--accent)] transition-colors"
                    >
                      {r.name}
                    </Link>
                    <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                      {TYPE_LABELS[r.type] || r.type} · {r.city}
                    </p>
                    {r.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
                        <span className="text-xs font-semibold text-[var(--accent-text)]">{r.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFavourite(r.id)}
                    disabled={removing === r.id}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {removing === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className="h-4 w-4 fill-red-400" />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ACCOUNT TAB
   ════════════════════════════════════════════════════════ */
function AccountTab({
  user, displayName, avatarUrl, memberSince, stats, signOut,
}: {
  user: any;
  displayName: string;
  avatarUrl?: string;
  memberSince: string;
  stats: Stats | null;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--accent)]/12 bg-[var(--canvas)] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg shrink-0" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-xl font-extrabold text-[var(--accent)] shadow ring-4 ring-white">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-[var(--text-1)] truncate">{displayName}</h3>
            <p className="text-xs text-[var(--text-3)] truncate">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                <BadgeCheck className="h-3 w-3" /> Food Lover
              </span>
              {memberSince && (
                <span className="text-[10px] text-[var(--text-3)]">since {memberSince}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <UsernameEditor />

      {stats && (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">Your Activity</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-lg font-extrabold text-blue-700">{stats.totalOrders}</p>
              <p className="text-[10px] text-blue-500 font-medium">Total Orders</p>
            </div>
            <div className="rounded-xl bg-[var(--accent-muted)] p-3">
              <p className="text-lg font-extrabold text-[var(--accent-text)]">
                Rs.{Math.round(stats.totalSpent).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-[var(--accent-hover)] font-medium">Total Spent</p>
            </div>
            <div className="rounded-xl bg-[var(--accent-muted)] p-3">
              <p className="text-lg font-extrabold text-[var(--accent)]">{stats.ratingsGiven}</p>
              <p className="text-[10px] text-[var(--accent)]/70 font-medium">Reviews Given</p>
            </div>
            {stats.favoriteRestaurant && (
              <div className="rounded-xl bg-red-50 p-3 flex items-center gap-2">
                {stats.favoriteRestaurant.imageUrl ? (
                  <img src={stats.favoriteRestaurant.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                    <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-red-600 truncate">{stats.favoriteRestaurant.name}</p>
                  <p className="text-[9px] text-red-400">Favourite spot</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-sm overflow-hidden divide-y divide-[var(--border)]">
        <AccountLink href="/" icon={UtensilsCrossed} label="Browse Restaurants" desc="Explore menus near you" />
        <AccountLink href="/contact" icon={MessageSquare} label="Help & Support" desc="Get help with your account or orders" />
        <AccountLink href="/legal" icon={Bookmark} label="Legal" desc="Privacy policy & terms of service" />
      </div>

      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[var(--canvas)] py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors shadow-sm"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>

      <p className="text-center text-[10px] text-[var(--text-3)] pb-4">HimaVolt · Food Lover Dashboard</p>
    </div>
  );
}

function AccountLink({ href, icon: Icon, label, desc }: { href: string; icon: typeof Bookmark; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 hover:bg-[var(--canvas-sub)] transition-colors">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface)] shrink-0">
        <Icon className="h-4 w-4 text-[var(--text-2)]" strokeWidth={1.8} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text-1)]">{label}</p>
        <p className="text-[11px] text-[var(--text-3)]">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-3)] shrink-0" />
    </Link>
  );
}

function UsernameEditor() {
  const [username, setUsername]         = useState("");
  const [currentUsername, setCurrent]   = useState<string | null>(null);
  const [status, setStatus]             = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "saving" | "saved">("idle");
  const checkedRef                       = useRef("");
  const debouncedUsername               = useDebounce(username, 400);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (d.username) { setUsername(d.username); setCurrent(d.username); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const u = debouncedUsername;
    if (!u || u === currentUsername || checkedRef.current === u) return;
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setStatus(u.length < 3 ? "idle" : "invalid"); return; }
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
    setStatus("idle");
    checkedRef.current = "";
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
      setCurrent(username);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("taken");
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Username</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            type="text"
            value={username}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="your_username"
            className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 transition-colors ${
              status === "available" ? "border-[var(--accent)] focus:ring-[var(--accent-border)]"
              : status === "taken" || status === "invalid" ? "border-red-400 focus:ring-red-200"
              : "border-[var(--border)] focus:border-[var(--accent-border)] focus:ring-[var(--accent-border)]"
            }`}
          />
          {status === "checking" && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[var(--text-3)]" />
          )}
          {status === "available" && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--accent-hover)]" />
          )}
        </div>
        {username !== currentUsername && (status === "available" || status === "saving") && (
          <button
            onClick={handleSave}
            disabled={status !== "available"}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors disabled:opacity-40"
          >
            {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {status === "saving" ? "Saving…" : "Save"}
          </button>
        )}
        {status === "saved" && (
          <div className="shrink-0 flex items-center gap-1 rounded-xl bg-[var(--accent-muted)] px-3 py-2 text-xs font-bold text-[var(--accent-text)]">
            <BadgeCheck className="h-3.5 w-3.5" /> Saved
          </div>
        )}
      </div>
      <p className={`mt-1.5 text-[11px] ${
        status === "available" ? "text-[var(--accent-text)]"
        : status === "taken" ? "text-red-500"
        : status === "invalid" ? "text-red-500"
        : "text-[var(--text-3)]"
      }`}>
        {status === "available" ? "Username is available!" : ""}
        {status === "taken" ? "Username is already taken" : ""}
        {status === "invalid" ? "3–20 chars: a–z, 0–9, underscores only" : ""}
        {(status === "idle" || status === "checking") && username !== currentUsername ? "3–20 chars: a–z, 0–9, underscores" : ""}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REWARDS TAB
   ════════════════════════════════════════════════════════ */
function RewardsTab({
  accounts,
  totalPoints,
}: {
  accounts: LoyaltyAccount[];
  totalPoints: number;
}) {
  const tierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "bg-purple-100 text-purple-700";
      case "GOLD": return "bg-yellow-100 text-yellow-700";
      case "SILVER": return "bg-[var(--surface)] text-[var(--text-2)]";
      default: return "bg-[var(--accent-muted)] text-[var(--accent-text)]";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text-1)]">Rewards</h2>
        <p className="text-xs text-[var(--text-3)] mt-0.5">
          {accounts.length === 0
            ? "Earn points on every order"
            : `${accounts.length} loyalty ${accounts.length === 1 ? "program" : "programs"}`}
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#eaa94d] to-[#d4922a] p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Gift className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold opacity-90">Total Points</p>
            <p className="text-2xl font-extrabold">{totalPoints.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-14 text-center">
          <Gift className="mx-auto h-9 w-9 text-[var(--text-3)] mb-3" />
          <p className="text-sm font-bold text-[var(--text-2)] mb-1">No rewards yet</p>
          <p className="text-xs text-[var(--text-3)] mb-4">
            Order from restaurants with loyalty programs to start earning points
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#d4922a] transition-colors"
          >
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              href={`/menu/${acc.restaurant.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-3.5 hover:border-[var(--accent-border)] hover:shadow-sm transition-all"
            >
              {acc.restaurant.imageUrl ? (
                <img
                  src={acc.restaurant.imageUrl}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover ring-1 ring-[var(--border)]"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                  <Utensils className="h-6 w-6 text-[var(--accent)]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-[var(--text-1)]">
                    {acc.restaurant.name}
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tierColor(acc.tier)}`}>
                    {acc.tier}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-3)]">
                  {formatPrice(acc.totalSpent, acc.restaurant.currency)} lifetime
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-extrabold text-[var(--accent)]">{acc.points.toLocaleString()}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">pts</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
