"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChevronDown,
  User,
  Store,
  Package,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { formatPrice } from "@/lib/currency";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNo: string;
  tableNo: string | null;
  roomNo: string | null;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee: number | null;
  deliveryAddress: string | null;
  isPrepaid: boolean;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  payment: { method: string; status: string; paidAt: string | null; amount: number } | null;
  restaurant: { id: string; name: string; slug: string; currency: string };
  user: { id: string; name: string; email: string; imageUrl: string | null } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ORDER_STATUSES = ["All", "PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "REJECTED"];

const STATUS_THEMES: Record<string, { bg: string, text: string, icon: any }> = {
  PENDING: { bg: "bg-orange-50", text: "text-orange-500", icon: Clock },
  ACCEPTED: { bg: "bg-blue-50", text: "text-blue-500", icon: CheckCircle2 },
  PREPARING: { bg: "bg-indigo-50", text: "text-indigo-500", icon: Package },
  READY: { bg: "bg-emerald-50", text: "text-emerald-500", icon: CheckCircle2 },
  DELIVERED: { bg: "bg-slate-50", text: "text-slate-500", icon: Truck },
  CANCELLED: { bg: "bg-red-50", text: "text-red-500", icon: XCircle },
  REJECTED: { bg: "bg-red-50", text: "text-red-500", icon: XCircle },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function AllOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  const fetchOrders = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (typeFilter !== "All") params.set("type", typeFilter);

        const res = await fetch(`/api/admin/orders?${params}`);
        const data = await res.json();
        setOrders(data.orders ?? []);
        setPagination(data.pagination);
      } catch (err) {
        setError("Failed to stream orders");
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, typeFilter],
  );

  useEffect(() => { fetchOrders(1); }, []);
  useEffect(() => { if (!loading) fetchOrders(page); }, [page, statusFilter, typeFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchOrders(1), 500);
  };

  // Simulated trend data
  const trendData = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, val: Math.floor(Math.random() * 50) })), []);

  const handleDelete = async (orderId: string) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) fetchOrders(page);
    } catch { /* silent */ }
    finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        fetchOrders(page);
        setSelectedIds(new Set());
      }
    } catch { /* silent */ }
    finally { setDeleting(false); setBulkDeleteOpen(false); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) fetchOrders(page);
    } catch {} finally { setUpdating(null); }
  };

  const nextStatus: Record<string, string> = {
    PENDING: "ACCEPTED",
    ACCEPTED: "PREPARING",
    PREPARING: "READY",
    READY: "DELIVERED",
  };

  return (
    <div className="space-y-10">
      {/* ── Order Insight Visualizer ── */}
      <section className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <TrendingUp className="h-48 w-48" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Order Velocity</span>
               </div>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trendData}>
                        <Area type="monotone" dataKey="val" stroke="#eaa94d" fill="rgba(234,169,77,0.1)" strokeWidth={4} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="rounded-[2.5rem] bg-white border border-slate-100 p-10 shadow-xl flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-black tracking-tighter text-slate-900 mb-2 uppercase italic">Stream Filter</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Isolate critical data nodes</p>
               
               <div className="space-y-6">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                     <input 
                        type="text" 
                        placeholder="Search IDs, Users..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-[var(--accent)] transition-all"
                     />
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {ORDER_STATUSES.slice(0, 5).map(s => (
                        <button 
                           key={s}
                           onClick={() => setStatusFilter(s)}
                           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <button 
               onClick={() => fetchOrders(page)}
               className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-orange-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
               Sync Stream
            </button>
         </div>
      </section>

      {/* ── The Living Order Stream ── */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-6">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Active Node Stream</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
               <span>Total: {pagination?.total || 0}</span>
               <div className="h-1 w-1 rounded-full bg-slate-200" />
               <span>Page: {pagination?.page || 1}</span>
            </div>
         </div>

         <div className="grid gap-4">
            {orders.map((order, i) => {
               const theme = STATUS_THEMES[order.status] || STATUS_THEMES.PENDING;
               const isExpanded = expandedId === order.id;
               
               return (
                  <motion.div
                     key={order.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className={`relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 ${isExpanded ? 'ring-2 ring-[var(--accent)] shadow-2xl' : ''}`}
                  >
                     <div 
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8 cursor-pointer"
                     >
                        {/* Status Node */}
                        <div className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center ${theme.bg} ${theme.text}`}>
                           <theme.icon className="h-6 w-6" />
                        </div>

                        {/* Primary Info */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter">#{order.orderNo}</h4>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${theme.bg} ${theme.text}`}>
                                 {order.status}
                              </div>
                           </div>
                           <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Store className="h-3 w-3 opacity-40" /> {order.restaurant.name}</span>
                              <div className="h-1 w-1 rounded-full bg-slate-200" />
                              <span className="flex items-center gap-1.5"><User className="h-3 w-3 opacity-40" /> {order.user?.name || "Guest"}</span>
                           </div>
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex items-center gap-8 text-right shrink-0">
                           <div className="hidden sm:block">
                              <p className="text-lg font-black text-slate-900 tracking-tight">{formatPrice(order.total, order.restaurant.currency)}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.items.length} Modules</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black text-slate-900">{timeAgo(order.createdAt)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Received</p>
                           </div>
                           <ChevronDown className={`h-5 w-5 text-slate-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-[var(--accent)]' : ''}`} />
                        </div>
                     </div>

                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-50 bg-slate-50/30 overflow-hidden"
                           >
                              <div className="p-8 md:p-10 space-y-10">
                                 <div className="grid md:grid-cols-2 gap-12">
                                    {/* Item Modules */}
                                    <div className="space-y-6">
                                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Order Payload</h5>
                                       <div className="space-y-3">
                                          {order.items.map(item => (
                                             <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                   <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-900">
                                                      {item.quantity}x
                                                   </div>
                                                   <span className="text-sm font-black text-slate-900">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">{formatPrice(item.price * item.quantity, order.restaurant.currency)}</span>
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Meta Nodes */}
                                    <div className="space-y-8 text-sm font-bold uppercase tracking-widest text-slate-400">
                                       <div className="grid grid-cols-2 gap-8">
                                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                             <p className="text-[9px] mb-2 opacity-50">Subtotal</p>
                                             <p className="text-slate-900">{formatPrice(order.subtotal, order.restaurant.currency)}</p>
                                          </div>
                                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                             <p className="text-[9px] mb-2 opacity-50">Tax Block</p>
                                             <p className="text-slate-900">{formatPrice(order.tax, order.restaurant.currency)}</p>
                                          </div>
                                       </div>
                                       <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/20">
                                          <div className="flex items-center justify-between mb-4">
                                             <span className="text-[10px] font-black tracking-[0.3em] opacity-40">Settlement Total</span>
                                             <Zap className="h-4 w-4 text-[var(--accent)]" />
                                          </div>
                                          <p className="text-3xl font-black tracking-tighter">{formatPrice(order.total, order.restaurant.currency)}</p>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Transition Control */}
                                 {nextStatus[order.status] && (
                                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                                       <button 
                                          onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                                          className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                                       >
                                          Abort Order
                                       </button>
                                       <button 
                                          onClick={() => updateOrderStatus(order.id, nextStatus[order.status])}
                                          className="px-8 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800"
                                       >
                                          Push to {nextStatus[order.status]}
                                       </button>
                                    </div>
                                 )}
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
                  className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
               >
                  <ChevronLeft className="h-6 w-6" />
               </button>
               <span className="text-xs font-black text-slate-900 uppercase tracking-widest px-8 py-3 bg-white rounded-full border border-slate-100 shadow-sm">
                  {page} / {pagination.totalPages}
               </span>
               <button 
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
               >
                  <ChevronRight className="h-6 w-6" />
               </button>
            </div>
         )}
      </div>
    </div>
  );
}
