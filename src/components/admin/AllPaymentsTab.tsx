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
  Trash2,
  CheckSquare,
} from "lucide-react";
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

const PAYMENT_STATUSES = ["All", "PENDING", "COMPLETED", "FAILED", "REFUNDED"];
const PAYMENT_METHODS = ["All", "ESEWA", "KHALTI", "BANK", "CASH", "COUNTER", "DIRECT"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  COMPLETED: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
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
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const allSelected = payments.length > 0 && selectedIds.size === payments.length;

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
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - selectedIds.size } : p);
        setSelectedIds(new Set());
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] p-4 shadow-sm">
          <p className="text-xs text-[var(--text-2)]">Total Amount</p>
          <p className="text-xl font-bold text-[var(--text-1)]">{formatPrice(summary.totalAmount, "NPR")}</p>
        </div>
        <div className="rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] p-4 shadow-sm">
          <p className="text-xs text-[var(--text-2)]">Total Transactions</p>
          <p className="text-xl font-bold text-[var(--text-1)]">{summary.totalCount.toLocaleString()}</p>
        </div>
        {pagination && (
          <div className="rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] p-4 shadow-sm">
            <p className="text-xs text-[var(--text-2)]">Filtered Results</p>
            <p className="text-xl font-bold text-[var(--text-1)]">{pagination.total.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search by transaction ID, order, restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2 pl-9 pr-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--accent)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            showFilters || statusFilter !== "All" || methodFilter !== "All"
              ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchPayments(page)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pb-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-[var(--text-3)] uppercase">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        statusFilter === s ? "bg-[var(--text-1)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-[var(--text-3)] uppercase">Method</p>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMethodFilter(m); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        methodFilter === m ? "bg-[var(--text-1)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-400 hover:text-red-600">Clear</button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--accent-muted)] px-4 py-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelectedIds(allSelected ? new Set() : new Set(payments.map((p) => p.id)))}
            className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
          />
          <CreditCard className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text-2)]">All Payments</span>
        </div>

        {loading && payments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No payments found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {payments.map((payment) => {
              const MethodIcon = METHOD_ICONS[payment.method] || CreditCard;
              const isExpanded = expandedId === payment.id;
              const isSelected = selectedIds.has(payment.id);
              return (
                <div key={payment.id} className={`transition-all hover:bg-[var(--accent-muted)]/40 ${isSelected ? "bg-red-50/30" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(payment.id)) next.delete(payment.id); else next.add(payment.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 flex-shrink-0 rounded accent-[var(--accent)]"
                    />
                    <div className={`flex-shrink-0 rounded-lg p-2 ${STATUS_COLORS[payment.status] || "bg-[var(--surface)] text-[var(--text-2)]"}`}>
                      <MethodIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-1)]">
                          {formatPrice(payment.amount, "NPR")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[payment.status]}`}>
                          {payment.status}
                        </span>
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-2)]">
                          {payment.method}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                        <span>Order #{payment.order.orderNo}</span>
                        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{payment.order.restaurant.name}</span>
                        {payment.order.user && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{payment.order.user.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-[var(--text-3)] tabular-nums">
                      {timeAgo(payment.createdAt)}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--accent-muted)] bg-[var(--accent-muted)]/30 px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-[var(--text-3)]">Transaction ID</span>
                              <p className="font-mono text-[var(--text-1)]">{payment.transactionId || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">PIDX</span>
                              <p className="font-mono text-[var(--text-1)]">{payment.pidx || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Ref ID</span>
                              <p className="font-mono text-[var(--text-1)]">{payment.refId || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Paid At</span>
                              <p className="font-medium text-[var(--text-1)]">
                                {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Order Total</span>
                              <p className="font-bold text-[var(--text-1)]">{formatPrice(payment.order.total, "NPR")}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Created</span>
                              <p className="font-medium text-[var(--text-1)]">{new Date(payment.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="pt-1">
                            <button
                              onClick={() => setDeleteTarget(payment)}
                              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Payment Record
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
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5">
            <span className="text-xs text-[var(--text-3)]">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-2)] hover:bg-[var(--accent-muted)] disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-2)] hover:bg-[var(--accent-muted)] disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete payment record?"
        description={`This will permanently delete the payment record for order #${deleteTarget?.order.orderNo} (${formatPrice(deleteTarget?.amount ?? 0, "NPR")}). This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} payment${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} payment record${selectedIds.size > 1 ? "s" : ""}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
