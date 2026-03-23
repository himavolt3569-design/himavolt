"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Store,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownRight,
  Banknote,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

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

const PAYMENT_STATUSES = ["All", "PENDING", "COMPLETED", "FAILED", "REFUNDED"];
const PAYMENT_METHODS = ["All", "ESEWA", "KHALTI", "BANK", "CASH", "COUNTER", "DIRECT"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-purple-100 text-purple-700",
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
  return `${Math.floor(hours / 24)}d ago`;
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
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setPayments(data.payments);
        setPagination(data.pagination);
        setSummary(data.summary);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, methodFilter],
  );

  useEffect(() => {
    fetchPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, methodFilter]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchPayments(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-gompa-slate">{formatPrice(summary.totalAmount, "NPR")}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Transactions</p>
          <p className="text-xl font-bold text-gompa-slate">{summary.totalCount.toLocaleString()}</p>
        </div>
        {pagination && (
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Filtered Results</p>
            <p className="text-xl font-bold text-gompa-slate">{pagination.total.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction ID, order, restaurant..."
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
            showFilters || statusFilter !== "All" || methodFilter !== "All"
              ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
              : "border-gray-200 text-gray-600 hover:bg-brand-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchPayments(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pb-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        statusFilter === s ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Method</p>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMethodFilter(m); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        methodFilter === m ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-brand-100 px-4 py-2.5">
          <CreditCard className="h-4 w-4 text-brand-400" />
          <span className="text-xs font-semibold text-gray-500">All Payments</span>
        </div>

        {loading && payments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No payments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((payment) => {
              const MethodIcon = METHOD_ICONS[payment.method] || CreditCard;
              const isExpanded = expandedId === payment.id;
              return (
                <div key={payment.id} className="transition-all hover:bg-brand-50/40">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className={`flex-shrink-0 rounded-lg p-2 ${STATUS_COLORS[payment.status] || "bg-gray-100 text-gray-600"}`}>
                      <MethodIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gompa-slate">
                          {formatPrice(payment.amount, "NPR")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[payment.status]}`}>
                          {payment.status}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          {payment.method}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Order #{payment.order.orderNo}</span>
                        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{payment.order.restaurant.name}</span>
                        {payment.order.user && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{payment.order.user.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
                      {timeAgo(payment.createdAt)}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-brand-100 bg-brand-50/30 px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-gray-400">Transaction ID</span>
                              <p className="font-mono text-gompa-slate">{payment.transactionId || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">PIDX</span>
                              <p className="font-mono text-gompa-slate">{payment.pidx || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Ref ID</span>
                              <p className="font-mono text-gompa-slate">{payment.refId || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Paid At</span>
                              <p className="font-medium text-gompa-slate">
                                {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Order Total</span>
                              <p className="font-bold text-gompa-slate">{formatPrice(payment.order.total, "NPR")}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Created</span>
                              <p className="font-medium text-gompa-slate">{new Date(payment.createdAt).toLocaleString()}</p>
                            </div>
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
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
