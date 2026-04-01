"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Star,
  MapPin,
  Users,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Trash2,
  CheckSquare,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  email: string | null;
  imageUrl: string | null;
  isActive: boolean;
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

const RESTAURANT_TYPES = [
  "All","RESTAURANT","FAST_FOOD","CAFE","BAR","HOTEL","RESORT",
  "BAKERY","CLOUD_KITCHEN","MO_MO_SHOP","TANDOORI","GUEST_HOUSE",
];

export default function AllRestaurantsTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const allSelected = restaurants.length > 0 && selectedIds.size === restaurants.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(restaurants.map((r) => r.id)));
  };

  const fetchRestaurants = useCallback(
    async (p = page) => {
      setLoading(true);
      setSelectedIds(new Set());
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (typeFilter !== "All") params.set("type", typeFilter);
        if (activeFilter) params.set("isActive", activeFilter);
        const res = await fetch(`/api/admin/restaurants?${params}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRestaurants(data.restaurants);
        setPagination(data.pagination);
      } catch { /* silent */ }
      finally { setLoading(false); }
    },
    [page, search, typeFilter, activeFilter],
  );

  useEffect(() => { fetchRestaurants(1); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (!loading) fetchRestaurants(page); /* eslint-disable-next-line */ }, [page, typeFilter, activeFilter]);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setPage(1); fetchRestaurants(1); }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: deleteTarget.id }),
      });
      if (res.ok) {
        setRestaurants((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      }
    } catch { /* silent */ }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setRestaurants((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - selectedIds.size } : p);
        setSelectedIds(new Set());
      }
    } catch { /* silent */ }
    finally { setDeleting(false); setBulkDeleteOpen(false); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: id, isActive: !current }),
      });
      if (res.ok) setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !current } : r)));
    } catch { /* silent */ }
    finally { setToggling(null); }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-2.5 ring-1 ring-red-100"
          >
            <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2">
              Deselect all
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedIds.size}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search restaurants, owners, cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gompa-slate placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            showFilters || typeFilter !== "All" || activeFilter
              ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
              : "border-gray-200 text-gray-600 hover:bg-brand-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchRestaurants(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {pagination && <span className="ml-auto text-xs text-gray-400">{pagination.total} restaurants</span>}
      </div>

      {/* Filter Chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pb-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESTAURANT_TYPES.map((t) => (
                    <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${typeFilter === t ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"}`}>
                      {t === "All" ? "All Types" : t.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {["", "true", "false"].map((v) => (
                    <button key={v} onClick={() => { setActiveFilter(v); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${activeFilter === v ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"}`}>
                      {v === "" ? "All" : v === "true" ? "Active" : "Inactive"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restaurants List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-brand-100 px-4 py-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 accent-red-500 cursor-pointer"
            title="Select all"
          />
          <Store className="h-4 w-4 text-brand-400" />
          <span className="text-xs font-semibold text-gray-500">All Restaurants</span>
        </div>

        {loading && restaurants.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No restaurants found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {restaurants.map((r) => {
              const isExpanded = expandedId === r.id;
              const isSelected = selectedIds.has(r.id);
              return (
                <div key={r.id} className={`transition-all ${isSelected ? "bg-red-50/60" : "hover:bg-brand-50/40"}`}>
                  <div className="flex w-full items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(r.id)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 accent-red-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 overflow-hidden">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.name} className="h-10 w-10 object-cover" />
                        ) : (
                          <Store className="h-5 w-5 text-brand-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gompa-slate truncate">{r.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {r.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            {r.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>
                          <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{r._count.orders}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r._count.staff}</span>
                          {r.rating > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{r.rating.toFixed(1)}</span>}
                        </div>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-xs font-medium text-gray-600">{r.owner.name}</p>
                        <p className="text-[11px] text-gray-400">{r.owner.email}</p>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-brand-100 bg-brand-50/30 px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div><span className="text-gray-400">Slug</span><p className="font-mono text-gompa-slate">{r.slug}</p></div>
                            <div><span className="text-gray-400">Code</span><p className="font-mono text-gompa-slate">{r.restaurantCode}</p></div>
                            <div><span className="text-gray-400">Phone</span><p className="font-medium text-gompa-slate">{r.phone}</p></div>
                            <div><span className="text-gray-400">Currency</span><p className="font-medium text-gompa-slate">{r.currency}</p></div>
                            <div><span className="text-gray-400">Menu Items</span><p className="font-medium text-gompa-slate">{r._count.menuItems}</p></div>
                            <div><span className="text-gray-400">Reviews</span><p className="font-medium text-gompa-slate">{r._count.reviews}</p></div>
                            <div><span className="text-gray-400">Total Orders</span><p className="font-bold text-gompa-slate">{r.totalOrders}</p></div>
                            <div><span className="text-gray-400">Created</span><p className="font-medium text-gompa-slate">{new Date(r.createdAt).toLocaleDateString()}</p></div>
                            <div className="col-span-2 sm:col-span-4"><span className="text-gray-400">Address</span><p className="font-medium text-gompa-slate">{r.address}</p></div>
                            <div className="col-span-2 sm:col-span-4"><span className="text-gray-400">Owner</span><p className="font-medium text-gompa-slate">{r.owner.name} ({r.owner.email})</p></div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button onClick={() => toggleActive(r.id, r.isActive)} disabled={toggling === r.id}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${r.isActive ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"}`}>
                              {r.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                              {toggling === r.id ? "Updating..." : r.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <a href={`/menu/${r.slug}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100">
                              <ExternalLink className="h-3.5 w-3.5" />View Menu
                            </a>
                            <button onClick={() => setDeleteTarget(r)}
                              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-all">
                              <Trash2 className="h-3.5 w-3.5" />Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Single delete */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the restaurant and all its orders, menu, staff, and data. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Bulk delete */}
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} restaurant${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} restaurant${selectedIds.size > 1 ? "s" : ""} and ALL their data (orders, menus, staff, reviews). This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
