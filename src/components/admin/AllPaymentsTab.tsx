"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Store,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Wallet,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatPrice } from "@/lib/currency";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  transactionId: string | null;
  pidx: string | null;
  refId: string | null;
  paidAt: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNo: string;
    total: number;
    restaurant: { id: string; name: string; slug: string };
    user: { id: string; name: string; email: string } | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_THEMES: Record<string, { bg: string, text: string, icon: any }> = {
  PENDING: { bg: "bg-orange-50", text: "text-orange-500", icon: Clock },
  COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-500", icon: CheckCircle2 },
  FAILED: { bg: "bg-red-50", text: "text-red-500", icon: XCircle },
  REFUNDED: { bg: "bg-purple-50", text: "text-purple-500", icon: RefreshCw },
};

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  ESEWA: Wallet,
  KHALTI: Wallet,
  BANK: Banknote,
  CASH: Banknote,
  COUNTER: CreditCard,
  DIRECT: CreditCard,
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

export default function AllPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<{ totalAmount: number; totalCount: number }>({ totalAmount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchPayments = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (methodFilter !== "All") params.set("method", methodFilter);

        const res = await fetch(`/api/admin/payments?${params}`);
        const data = await res.json();
        setPayments(data.payments || []);
        setPagination(data.pagination);
        setSummary(data.summary || { totalAmount: 0, totalCount: 0 });
      } catch {} finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, methodFilter],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: deleteTarget.id }),
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      }
    } catch { /* silent */ }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  useEffect(() => { fetchPayments(1); }, []);
  useEffect(() => { if (!loading) fetchPayments(page); }, [page, statusFilter, methodFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchPayments(1), 500);
  };

  // Simulated revenue data
  const revenueData = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ time: `${i}h`, val: Math.floor(Math.random() * 5000) + 1000 })), []);

  return (
    <div className="space-y-10">
      {/* ── Revenue Flow Visualizer ── */}
      <section className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <TrendingUp className="h-48 w-48" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Financial Velocity</span>
               </div>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={revenueData}>
                        <Area type="monotone" dataKey="val" stroke="#10b981" fill="rgba(16,185,129,0.1)" strokeWidth={4} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="rounded-[2.5rem] bg-white border border-slate-100 p-10 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
               <div>
                  <h3 className="text-xl font-black tracking-tighter text-slate-900 mb-1 uppercase italic">Total Settlement</h3>
                  <p className="text-3xl font-black text-[var(--accent)] tracking-tighter">{formatPrice(summary.totalAmount, "NPR")}</p>
               </div>
               
               <div className="space-y-4">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                     <input 
                        type="text" 
                        placeholder="Search TXID, User..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-[var(--accent)] transition-all"
                     />
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {["All", "ESEWA", "KHALTI", "CASH"].map(m => (
                        <button 
                           key={m}
                           onClick={() => setMethodFilter(m)}
                           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${methodFilter === m ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                           {m}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <button 
               onClick={() => fetchPayments(page)}
               className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
               Sync Ledger
            </button>
         </div>
      </section>

      {/* ── The Settlement Stream ── */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-6">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Transaction Ledger</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
               <span>Global: {pagination?.total || 0}</span>
               <div className="h-1 w-1 rounded-full bg-slate-200" />
               <Zap className="h-4 w-4 opacity-40 text-emerald-500" />
            </div>
         </div>

         <div className="grid gap-4">
            {payments.map((p, i) => {
               const theme = STATUS_THEMES[p.status] || STATUS_THEMES.PENDING;
               const MethodIcon = METHOD_ICONS[p.method] || CreditCard;
               const isExpanded = expandedId === p.id;
               
               return (
                  <motion.div
                     key={p.id}
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.05 }}
                     className={`relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 ${isExpanded ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                     <div 
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8 cursor-pointer"
                     >
                        {/* Method Node */}
                        <div className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400`}>
                           <MethodIcon className="h-6 w-6" />
                        </div>

                        {/* Primary Info */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter">{formatPrice(p.amount, "NPR")}</h4>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${theme.bg} ${theme.text}`}>
                                 {p.status}
                              </div>
                           </div>
                           <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Store className="h-3 w-3 opacity-40" /> {p.order.restaurant.name}</span>
                              <div className="h-1 w-1 rounded-full bg-slate-200" />
                              <span className="flex items-center gap-1.5"><User className="h-3 w-3 opacity-40" /> {p.order.user?.name || "Guest"}</span>
                           </div>
                        </div>

                        {/* Transaction & Chevron */}
                        <div className="flex items-center gap-8 text-right shrink-0">
                           <div className="hidden sm:block text-right">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Order #{p.order.orderNo}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{p.method}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black text-slate-900">{timeAgo(p.createdAt)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Settled</p>
                           </div>
                           <ChevronDown className={`h-5 w-5 text-slate-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`} />
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
                                 <div className="grid md:grid-cols-3 gap-12">
                                    {/* Tech Metadata */}
                                    <div className="space-y-8 col-span-2">
                                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ledger Details</h5>
                                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                                          {[
                                             { label: "Transaction ID", val: p.transactionId || "INTERNAL", mono: true },
                                             { label: "PIDX Reference", val: p.pidx || "—", mono: true },
                                             { label: "Internal Ref", val: p.refId || "—", mono: true },
                                             { label: "Amount Block", val: formatPrice(p.amount, "NPR") },
                                             { label: "Settled At", val: p.paidAt ? new Date(p.paidAt).toLocaleString() : "Awaiting" },
                                          ].map(meta => (
                                             <div key={meta.label}>
                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{meta.label}</p>
                                                <p className={`text-sm font-black text-slate-900 ${meta.mono ? 'font-mono tracking-tighter' : ''}`}>{meta.val}</p>
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Action Command Hub */}
                                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-end">
                                       <button 
                                          onClick={() => setDeleteTarget(p)}
                                          className="w-full py-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                       >
                                          <Trash2 className="h-4 w-4" /> Purge Ledger Entry
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
                  className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
               >
                  <ChevronLeft className="h-6 w-6" />
               </button>
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-10 py-4 bg-white rounded-full border border-slate-100 shadow-sm">
                  Page {page} of {pagination.totalPages}
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Purge Ledger Record?"
        description={`This will permanently delete the payment entry for order #${deleteTarget?.order.orderNo}. This action is irreversible.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
