"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Search, Plus, MapPin, UsersRound, ArrowRight,
  Loader2, ChevronRight, Building2, Monitor,
  UtensilsCrossed, Coffee, Zap, Cake, Cloud, Wine, Utensils, Flame, Home, Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRestaurant } from "@/context/RestaurantContext";
import CreateRestaurantModal from "@/components/modals/CreateRestaurantModal";
import { getTypeLabel } from "@/lib/restaurant-types";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  RESTAURANT: UtensilsCrossed, CAFE: Coffee, FAST_FOOD: Zap, BAKERY: Cake,
  CLOUD_KITCHEN: Cloud, BAR: Wine, HOTEL: Building2, RESORT: Sun,
  MO_MO_SHOP: Utensils, TANDOORI: Flame, GUEST_HOUSE: Home,
};

export default function ManageRestaurantsPage() {
  const router = useRouter();
  const { restaurants, selectRestaurant, loading } = useRestaurant();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(
    () =>
      restaurants.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [restaurants, search],
  );

  const handleDashboard = (id: string) => {
    selectRestaurant(id);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-[var(--border)]/70 bg-[var(--canvas)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)] transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-3)] mb-0.5">
                <span>Home</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-[var(--text-2)]">Restaurants</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-1)]">
                Manage Restaurants
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-40 rounded-lg bg-[var(--canvas-sub)] py-2 pl-9 pr-3 text-[13px] text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 ring-[var(--border)] transition-all focus:bg-[var(--canvas)] focus:ring-[var(--accent-border)] lg:w-48"
              />
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[var(--accent)] active:scale-[0.97] sm:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {!loading && filtered.length > 0 && (
          <p className="text-[12px] font-medium text-[var(--text-3)] mb-4">
            {filtered.length} restaurant{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)] mb-3" />
            <p className="text-sm text-[var(--text-3)]">Loading restaurants...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--surface)]">
                  <Building2 className="h-7 w-7 text-[var(--text-3)]" />
                </div>
                <p className="text-lg font-bold text-[var(--text-1)]">
                  {search
                    ? "No restaurants match your search"
                    : "No restaurants yet"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-3)] max-w-xs">
                  {search
                    ? "Try a different search term"
                    : "Create your first restaurant and start managing orders, menus, and staff."}
                </p>
                {!search && (
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent)] active:scale-[0.97]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Restaurant
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filtered.map((restaurant, i) => (
                  <motion.div
                    key={restaurant.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.04 }}
                    className="group overflow-hidden rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] transition-all hover:ring-[var(--border)]"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      {/* Left: icon + info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--canvas-sub)] ring-1 ring-[var(--border)]">
                          {(() => { const Icon = TYPE_ICON[restaurant.type] ?? UtensilsCrossed; return <Icon className="h-5 w-5 text-[var(--text-2)]" />; })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="truncate text-[15px] font-bold text-[var(--text-1)]">
                              {restaurant.name}
                            </h3>
                            <span className="shrink-0 rounded-md bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-text)]">
                              {getTypeLabel(restaurant.type)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--text-3)]">
                            {restaurant.address && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {restaurant.address}
                              </span>
                            )}
                            <span className="hidden items-center gap-1 sm:flex">
                              <UsersRound className="h-3 w-3" />
                              {restaurant.staff.length} staff
                            </span>
                            <span>
                              {restaurant._count.menuItems} items ·{" "}
                              {restaurant._count.orders} orders
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Link
                          href={`/pos/${restaurant.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[var(--accent)] active:scale-[0.97]"
                          title="Open POS / Kiosk terminal"
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          POS
                        </Link>
                        <button
                          onClick={() => handleDashboard(restaurant.id)}
                          className="flex items-center justify-center gap-2 rounded-lg bg-[#0F1219] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#1a2030] active:scale-[0.97]"
                        >
                          Dashboard
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      <CreateRestaurantModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
