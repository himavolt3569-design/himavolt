"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  MapPin,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Trash2,
  Zap,
  Rocket,
  LayoutGrid,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import Link from "next/link";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import RestaurantFeatureOverridesModal from "@/components/admin/RestaurantFeatureOverridesModal";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [featuresTarget, setFeaturesTarget] = useState<Restaurant | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchRestaurants = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (typeFilter !== "All") params.set("type", typeFilter);
        if (activeFilter) params.set("isActive", activeFilter);
        const res = await fetch(`/api/admin/restaurants?${params}`, { cache: "no-store" });
        const data = await res.json();
        setRestaurants(data.restaurants || []);
        setPagination(data.pagination);
      } catch {} finally { setLoading(false); }
    },
    [page, search, typeFilter, activeFilter],
  );

  useEffect(() => { fetchRestaurants(1); }, []);
  useEffect(() => { if (!loading) fetchRestaurants(page); }, [page, typeFilter, activeFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchRestaurants(1), 500);
  };

  // Chart Data: Orders by top 5 restaurants
  const chartData = useMemo(() => 
    restaurants.slice(0, 6).map(r => ({ name: r.name.split(' ')[0], orders: r.totalOrders })), 
    [restaurants]
  );

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

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: id, isActive: !current }),
      });
      if (res.ok) fetchRestaurants(page);
    } catch {} finally { setToggling(null); }
  };

  return (
    <div className="space-y-10">
      {/* ── Kitchen Performance Visualizer ── */}
      <section className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 rounded-[2.5rem] bg-[var(--text-1)] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Rocket className="h-48 w-48" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Market Presence</span>
               </div>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                        <Bar dataKey="orders" fill="#eaa94d" radius={[10, 10, 0, 0]}>
                           {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fillOpacity={0.8} />
                           ))}
                        </Bar>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] p-10 shadow-xl flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-black tracking-tighter text-[var(--text-1)] mb-2 uppercase italic">Registry Filter</h3>
               <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-8">Manage active nodes</p>
               
               <div className="space-y-6">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                     <input 
                        type="text" 
                        placeholder="Search City, Owner..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full bg-[var(--surface-alt)] border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-[var(--accent)] transition-all"
                     />
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {RESTAURANT_TYPES.slice(0, 5).map(t => (
                        <button 
                           key={t}
                           onClick={() => setTypeFilter(t)}
                           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === t ? 'bg-[var(--text-1)] text-[var(--canvas)] shadow-lg' : 'bg-[var(--surface-alt)] text-[var(--text-3)] hover:bg-[var(--surface-alt)]'}`}
                        >
                           {t === 'All' ? 'All' : t.split('_')[0]}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <button 
               onClick={() => fetchRestaurants(page)}
               className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-orange-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
               Update Registry
            </button>
         </div>
      </section>

      {/* ── The Kitchen Gallery ── */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-6">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-3)]">Node Directory</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-3)]">
               <span>Total: {pagination?.total || 0}</span>
               <div className="h-1 w-1 rounded-full bg-[var(--border-soft)]" />
               <LayoutGrid className="h-4 w-4 opacity-40" />
            </div>
         </div>

         <div className="grid gap-6">
            {restaurants.map((r, i) => {
               const isExpanded = expandedId === r.id;
               
               return (
                  <motion.div
                     key={r.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className={`relative overflow-hidden rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 ${isExpanded ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  >
                     <div 
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="flex flex-col md:flex-row md:items-center gap-8 p-6 md:p-10 cursor-pointer"
                     >
                        {/* Image Node */}
                        <div className="h-20 w-20 shrink-0 rounded-3xl overflow-hidden shadow-xl border-4 border-[var(--surface)]">
                           {r.imageUrl ? (
                              <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                           ) : (
                              <div className="h-full w-full bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-3)]">
                                 <Store className="h-8 w-8" />
                              </div>
                           )}
                        </div>

                        {/* Primary Info */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-4 mb-2">
                              <h4 className="text-2xl font-black text-[var(--text-1)] tracking-tighter">{r.name}</h4>
                              <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                 {r.isActive ? 'Active' : 'Offline'}
                              </div>
                           </div>
                           <div className="flex items-center gap-6 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 opacity-40 text-[var(--accent)]" /> {r.city}</span>
                              <span className="flex items-center gap-2"><ShoppingBag className="h-3.5 w-3.5 opacity-40 text-[var(--accent)]" /> {r.totalOrders} Global Orders</span>
                              <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]" /> {r.rating.toFixed(1)}</span>
                           </div>
                        </div>

                        {/* Actions & Chevron */}
                        <div className="flex items-center gap-12 shrink-0">
                           <div className="hidden lg:block text-right">
                              <p className="text-xs font-black text-[var(--text-1)] uppercase tracking-tighter">{r.owner.name}</p>
                              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase truncate max-w-[120px]">{r.owner.email}</p>
                           </div>
                           <ChevronDown className={`h-6 w-6 text-slate-200 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-[var(--accent)]' : ''}`} />
                        </div>
                     </div>

                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-50 bg-slate-50/20 overflow-hidden"
                           >
                              <div className="p-10 md:p-14 space-y-12">
                                 <div className="grid md:grid-cols-3 gap-12">
                                    {/* Tech Metadata */}
                                    <div className="space-y-8 col-span-2">
                                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-3)]">Node Configuration</h5>
                                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                                          {[
                                             { label: "Internal Slug", val: r.slug, mono: true },
                                             { label: "Access Code", val: r.restaurantCode, mono: true },
                                             { label: "Currency", val: r.currency },
                                             { label: "Staff Pool", val: r._count.staff },
                                             { label: "Catalog Size", val: r._count.menuItems },
                                             { label: "Review Count", val: r._count.reviews },
                                          ].map(meta => (
                                             <div key={meta.label}>
                                                <p className="text-[9px] font-black text-[var(--text-3)] uppercase mb-1 tracking-widest">{meta.label}</p>
                                                <p className={`text-sm font-black text-[var(--text-1)] ${meta.mono ? 'font-mono tracking-tighter' : ''}`}>{meta.val}</p>
                                             </div>
                                          ))}
                                       </div>
                                       <div className="pt-8">
                                          <p className="text-[9px] font-black text-[var(--text-3)] uppercase mb-2 tracking-widest">Physical Origin</p>
                                          <p className="text-sm font-black text-[var(--text-1)]">{r.address}</p>
                                       </div>
                                    </div>

                                    {/* Action Command Hub */}
                                    <div className="bg-[var(--surface)] p-8 rounded-[3rem] shadow-xl border border-[var(--border-soft)] flex flex-col justify-between gap-4">
                                       <button 
                                          onClick={() => toggleActive(r.id, r.isActive)}
                                          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${r.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                       >
                                          {r.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                          {r.isActive ? 'Deactivate Node' : 'Initialize Node'}
                                       </button>
                                       
                                       <Link href={`/menu/${r.slug}`} target="_blank" className="w-full py-4 rounded-2xl bg-[var(--surface-alt)] text-[var(--text-3)] hover:text-[var(--text-1)] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                                          <ExternalLink className="h-4 w-4" /> View Interface
                                       </Link>
                                       
                                       <button 
                                          onClick={() => setFeaturesTarget(r)}
                                          className="w-full py-4 rounded-2xl bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                       >
                                          <Zap className="h-4 w-4" /> Feature Overrides
                                       </button>

                                       <button 
                                          onClick={() => setDeleteTarget(r)}
                                          className="w-full py-4 rounded-2xl bg-red-500 text-white shadow-xl shadow-red-200 hover:bg-red-600 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                       >
                                          <Trash2 className="h-4 w-4" /> Wipe Node
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               );
            })}
         </div>

         {/* Pagination Flow */}
         {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-12">
               <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-14 w-14 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-all"
               >
                  <ChevronLeft className="h-6 w-6" />
               </button>
               <span className="text-[10px] font-black text-[var(--text-1)] uppercase tracking-widest px-10 py-4 bg-[var(--surface)] rounded-full border border-[var(--border-soft)] shadow-sm">
                  {page} of {pagination.totalPages}
               </span>
               <button 
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-14 w-14 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-all"
               >
                  <ChevronRight className="h-6 w-6" />
               </button>
            </div>
         )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Wipe Node "${deleteTarget?.name}"?`}
        description="This will permanently delete the restaurant and all its associated data clusters. This action is irreversible."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

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
