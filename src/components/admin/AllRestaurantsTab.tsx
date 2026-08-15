"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Store,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  ExternalLink,
  Trash2,
  Zap,
  Settings2,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
  EyeOff,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import RestaurantFeatureOverridesModal from "@/components/admin/RestaurantFeatureOverridesModal";
import RestaurantManagerModal from "@/components/admin/RestaurantManagerModal";
import { clearAllResourceSnapshots } from "@/hooks/useRestaurantResource";

/**
 * Every business on the platform, as an operator ledger.
 *
 * Built for one job: find a venue, read its state, act — without hunting. Three
 * decisions carry that:
 *
 * 1. **The trading spine.** `isActive` (listed on the platform) and `isOpen`
 *    (trading right now) are different facts that the old card grid collapsed
 *    into one "Active" pill, so "delisted" and "closed for the night" looked
 *    identical. They are now one colour-coded edge per row, which means the
 *    health of the whole page reads in a single vertical pass.
 * 2. **Actions are always visible.** Every action used to sit behind an
 *    expand-click, so acting on a venue cost two interactions and only one
 *    venue could be considered at a time.
 * 3. **Rows, not cards.** The old 2.5rem-radius cards fitted about three
 *    businesses on screen. Aligned columns with monospaced numerals fit ten and
 *    let counts be compared down the column without reading them.
 */

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  imageUrl: string | null;
  isActive: boolean;
  /** Staff-controllable "taking orders right now". Absent on older payloads. */
  isOpen?: boolean;
  rating: number;
  totalOrders: number;
  restaurantCode: string;
  currency: string;
  createdAt: string;
  owner: { id: string; name: string; email: string; imageUrl: string | null };
  _count: { orders: number; staff: number; menuItems: number; reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_FILTERS = [
  { id: "All", label: "All" },
  { id: "RESTAURANT", label: "Restaurants" },
  { id: "FAST_FOOD", label: "Fast food" },
  { id: "CAFE", label: "Cafes" },
  { id: "BAR", label: "Bars" },
  { id: "HOTEL", label: "Hotels" },
  { id: "RESORT", label: "Resorts" },
  { id: "GUEST_HOUSE", label: "Guest houses" },
  { id: "BAKERY", label: "Bakeries" },
  { id: "CLOUD_KITCHEN", label: "Cloud kitchens" },
  { id: "MO_MO_SHOP", label: "Momo shops" },
  { id: "TANDOORI", label: "Tandoori" },
];

/** The three states a business can be in, and how each reads on the spine. */
type Trading = "trading" | "closed" | "delisted";

const TRADING: Record<
  Trading,
  { label: string; spine: string; dot: string; text: string }
> = {
  trading: {
    label: "Trading",
    spine: "bg-emerald-500",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  closed: {
    label: "Closed now",
    spine: "bg-amber-400",
    dot: "bg-amber-400",
    text: "text-amber-700",
  },
  delisted: {
    label: "Delisted",
    spine: "bg-[var(--border)]",
    dot: "bg-[var(--text-3)]",
    text: "text-[var(--text-3)]",
  },
};

function tradingStateOf(r: Restaurant): Trading {
  if (!r.isActive) return "delisted";
  return r.isOpen === false ? "closed" : "trading";
}

function typeLabel(type: string): string {
  const known = TYPE_FILTERS.find((t) => t.id === type);
  if (known && known.id !== "All") return known.label.replace(/s$/, "");
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Numerals are monospaced everywhere so counts line up down the column. */
const NUM = "font-mono tabular-nums";

export default function AllRestaurantsTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [featuresTarget, setFeaturesTarget] = useState<Restaurant | null>(null);
  const [manageTarget, setManageTarget] = useState<Restaurant | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchRestaurants = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (typeFilter !== "All") params.set("type", typeFilter);
        if (statusFilter) params.set("isActive", statusFilter);
        const res = await fetch(`/api/admin/restaurants?${params}`, { cache: "no-store" });
        const data = await res.json();
        setRestaurants(data.restaurants || []);
        setPagination(data.pagination);
      } catch {
        setError("Could not load businesses. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [page, search, typeFilter, statusFilter],
  );

  useEffect(() => { fetchRestaurants(1); }, []);
  useEffect(() => { if (!loading) fetchRestaurants(page); }, [page, typeFilter, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchRestaurants(1), 400);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setStatusFilter("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setTimeout(() => fetchRestaurants(1), 0);
  };

  /** Counts describe the loaded page, and the label says so. */
  const tally = useMemo(() => {
    const t = { trading: 0, closed: 0, delisted: 0 };
    restaurants.forEach((r) => { t[tradingStateOf(r)] += 1; });
    return t;
  }, [restaurants]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: deleteTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete that business.");
      } else {
        setRestaurants((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setPagination((p) => (p ? { ...p, total: p.total - 1 } : p));
      }
    } catch {
      setError("Network error while deleting. Try again.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /**
   * Open the business's own owner dashboard — the real one, with its sidebar,
   * analytics and every feature tab. The server hands back an impersonation
   * cookie; a hard navigation (not a router push) is required so every context
   * in the admin tree is torn down rather than carried across.
   */
  const openOwnerDashboard = async (r: Restaurant) => {
    setOpening(r.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: r.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not open that dashboard.");
        return;
      }
      // The dashboard snapshots tables/menu/stock to localStorage for instant
      // repeat paints. Those outlive the session, so a leftover snapshot from a
      // previous business would paint ITS data for one frame before
      // revalidation replaced it. Same clean-up the sign-out path does.
      clearAllResourceSnapshots();
      try {
        localStorage.removeItem("himavolt:selectedRestaurantId");
      } catch {
        /* private mode — the scoped /api/restaurants list still selects right */
      }
      window.location.href = data.redirectTo ?? "/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setOpening(null);
    }
  };

  const toggleListed = async (r: Restaurant) => {
    setBusyId(r.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: r.id, isActive: !r.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not change that listing.");
        return;
      }
      setRestaurants((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)),
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const filtersActive = !!search || typeFilter !== "All" || !!statusFilter;

  return (
    <div className="space-y-5">
      {/* ── Find bar. The search is the hero: everything else is a narrowing. ── */}
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by business, owner, city or link"
              aria-label="Search businesses"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-11 pr-4 text-sm font-medium text-[var(--text-1)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--text-3)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status was a dead control before: the state existed with no setter. */}
            <div className="flex rounded-xl border border-[var(--border)] p-0.5">
              {([
                { id: "", label: "All" },
                { id: "true", label: "Listed" },
                { id: "false", label: "Delisted" },
              ] as const).map((s) => (
                <button
                  key={s.id || "any"}
                  type="button"
                  onClick={() => { setStatusFilter(s.id); setPage(1); }}
                  aria-pressed={statusFilter === s.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${
                    statusFilter === s.id
                      ? "bg-[var(--text-1)] text-[var(--canvas)]"
                      : "text-[var(--text-3)] hover:text-[var(--text-1)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchRestaurants(page)}
              aria-label="Refresh list"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-3)] transition-colors hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTypeFilter(t.id); setPage(1); }}
              aria-pressed={typeFilter === t.id}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${
                typeFilter === t.id
                  ? "bg-[var(--accent)]/15 text-[var(--accent-hover)]"
                  : "text-[var(--text-3)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-3)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded p-0.5 hover:bg-rose-100"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Tally. Reads the spine column back as numbers. ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs">
        <span className="font-bold text-[var(--text-1)]">
          <span className={NUM}>{pagination?.total ?? 0}</span>{" "}
          <span className="font-medium text-[var(--text-3)]">
            business{(pagination?.total ?? 0) === 1 ? "" : "es"} total
          </span>
        </span>
        {(["trading", "closed", "delisted"] as Trading[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 font-medium text-[var(--text-3)]">
            <span className={`h-2 w-2 rounded-full ${TRADING[k].dot}`} />
            <span className={`${NUM} font-bold text-[var(--text-1)]`}>{tally[k]}</span>
            {TRADING[k].label.toLowerCase()}
          </span>
        ))}
        <span className="text-[var(--text-3)]">on this page</span>
      </div>

      {/* ── The ledger ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        {/* Column headings, desktop only — the stacked layout below lg is self-labelling. */}
        <div className="hidden items-center gap-4 border-b border-[var(--border-soft)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-3)] lg:flex">
          <span className="w-1 shrink-0" aria-hidden />
          <span className="flex-1">Business</span>
          <span className="w-32 shrink-0">Owner</span>
          <span className="w-16 shrink-0 text-right">Orders</span>
          <span className="w-14 shrink-0 text-right">Menu</span>
          <span className="w-14 shrink-0 text-right">Staff</span>
          <span className="w-12 shrink-0 text-right">Rating</span>
          <span className="w-[248px] shrink-0 text-right">Actions</span>
        </div>

        {loading && restaurants.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--text-3)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading businesses
          </div>
        ) : restaurants.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="text-sm font-bold text-[var(--text-1)]">
              {filtersActive ? "No businesses match those filters" : "No businesses yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-3)]">
              {filtersActive
                ? "Try a different search, or clear the filters to see every business."
                : "Businesses appear here as soon as an owner signs up."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {restaurants.map((r) => {
              const state = tradingStateOf(r);
              const tone = TRADING[state];
              const isBusy = busyId === r.id;
              const isOpening = opening === r.id;

              return (
                <li
                  key={r.id}
                  className="group relative flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-alt)]/60 lg:flex-row lg:items-center lg:gap-4"
                >
                  {/* The spine: listed + trading, listed + closed, or delisted. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 h-full w-[3px] ${tone.spine}`}
                  />

                  <span className="hidden w-1 shrink-0 lg:block" aria-hidden />

                  {/* Identity */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-alt)]">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[var(--text-3)]">
                          <Store className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-[var(--text-1)]">
                          {r.name}
                        </p>
                        <span
                          className={`flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${tone.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {tone.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--text-3)]">
                        {typeLabel(r.type)} · {r.city} ·{" "}
                        <span className={NUM}>/{r.slug}</span>
                      </p>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="min-w-0 lg:w-32 lg:shrink-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-1)]">
                      {r.owner?.name || "No owner"}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-3)]">
                      {r.owner?.email}
                    </p>
                  </div>

                  {/* Counts. Mono + tabular so they compare down the column. */}
                  <div className="flex items-center gap-4 text-xs lg:contents">
                    <Metric label="Orders" value={r.totalOrders} width="lg:w-16" />
                    <Metric label="Menu" value={r._count?.menuItems ?? 0} width="lg:w-14" />
                    <Metric label="Staff" value={r._count?.staff ?? 0} width="lg:w-14" />
                    <div className="lg:w-12 lg:shrink-0 lg:text-right">
                      <span className="flex items-center gap-1 lg:justify-end">
                        <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
                        <span className={`${NUM} font-bold text-[var(--text-1)]`}>
                          {r.rating.toFixed(1)}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] lg:hidden">
                        Rating
                      </span>
                    </div>
                  </div>

                  {/* Actions — always reachable, never behind an expand. */}
                  <div className="flex items-center justify-end gap-1.5 lg:w-[248px] lg:shrink-0">
                    <button
                      type="button"
                      onClick={() => openOwnerDashboard(r)}
                      disabled={isOpening}
                      title="Open this business's own dashboard as its owner"
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                    >
                      {isOpening ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      )}
                      Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => setManageTarget(r)}
                      title="Edit details, menu, tables, staff and rooms"
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    <IconButton
                      label="Feature access"
                      onClick={() => setFeaturesTarget(r)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </IconButton>

                    <Link
                      href={`/menu/${r.slug}`}
                      target="_blank"
                      title="Open the public page"
                      aria-label={`Open the public page for ${r.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-3)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    <IconButton
                      label={r.isActive ? "Remove from the platform" : "List on the platform"}
                      onClick={() => toggleListed(r)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : r.isActive ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </IconButton>

                    <IconButton
                      label="Delete this business"
                      onClick={() => setDeleteTarget(r)}
                      tone="danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-xs font-medium text-[var(--text-3)]">
            Page <span className={`${NUM} font-bold text-[var(--text-1)]`}>{page}</span> of{" "}
            <span className={NUM}>{pagination.totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-3)] transition-colors hover:text-[var(--text-1)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-3)] transition-colors hover:text-[var(--text-1)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently removes the business along with its orders, payments, bills and feedback. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {manageTarget && (
        <RestaurantManagerModal
          restaurantId={manageTarget.id}
          restaurantName={manageTarget.name}
          onClose={() => setManageTarget(null)}
          onSaved={() => fetchRestaurants(page)}
        />
      )}

      {featuresTarget && (
        <RestaurantFeatureOverridesModal
          restaurantId={featuresTarget.id}
          restaurantName={featuresTarget.name}
          restaurantType={featuresTarget.type}
          onClose={() => setFeaturesTarget(null)}
        />
      )}
    </div>
  );
}

/**
 * One count. Labelled inline on mobile, aligned to a column on desktop.
 *
 * `width` must arrive as a complete class (`"lg:w-16"`), never composed from a
 * fragment — Tailwind scans source text for whole class names, so a template
 * like `lg:${w}` produces a class that is never generated.
 */
function Metric({
  label,
  value,
  width,
}: {
  label: string;
  value: number;
  width: string;
}) {
  return (
    <div className={`lg:shrink-0 lg:text-right ${width}`}>
      <span className={`${NUM} block text-sm font-bold text-[var(--text-1)]`}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] lg:hidden">
        {label}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 ${
        tone === "danger"
          ? "text-rose-500 hover:bg-rose-50"
          : "text-[var(--text-3)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)]"
      }`}
    >
      {children}
    </button>
  );
}
