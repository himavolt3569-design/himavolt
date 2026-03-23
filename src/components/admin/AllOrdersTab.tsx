"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Eye,
  X,
  ChevronDown,
  User,
  Store,
  Package,
} from "lucide-react";
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
const ORDER_TYPES = ["All", "DINE_IN", "DELIVERY", "TAKEAWAY"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-indigo-100 text-indigo-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  PREPARING: Package,
  READY: CheckCircle2,
  DELIVERED: Truck,
  CANCELLED: XCircle,
  REJECTED: XCircle,
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AllOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchOrders = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (typeFilter !== "All") params.set("type", typeFilter);

        const res = await fetch(`/api/admin/orders?${params}`);
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, typeFilter],
  );

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(page), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders, page]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchOrders(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
        );
      }
    } catch {
      // silent
    } finally {
      setUpdating(null);
    }
  };

  const nextStatus: Record<string, string> = {
    PENDING: "ACCEPTED",
    ACCEPTED: "PREPARING",
    PREPARING: "READY",
    READY: "DELIVERED",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, restaurants, customers..."
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
            showFilters || statusFilter !== "All" || typeFilter !== "All"
              ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
              : "border-gray-200 text-gray-600 hover:bg-brand-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchOrders(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-gray-400">{pagination.total.toLocaleString()} orders</span>
        )}
      </div>

      {/* Filter Chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pb-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        statusFilter === s ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                      }`}
                    >
                      {s === "All" ? "All Statuses" : s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setPage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        typeFilter === t ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                      }`}
                    >
                      {t === "All" ? "All Types" : t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand-400" />
            <span className="text-xs font-semibold text-gray-500">All Orders</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            Auto-refresh
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] || Clock;
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id} className="transition-all hover:bg-brand-50/40">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className={`flex-shrink-0 rounded-lg p-2 ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gompa-slate">#{order.orderNo}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          {order.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {order.restaurant.name}
                        </span>
                        {order.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.user.name || order.user.email}
                          </span>
                        )}
                        {order.tableNo && <span>Table {order.tableNo}</span>}
                      </div>
                    </div>
                    <div className="hidden flex-shrink-0 text-right sm:block">
                      <p className="text-sm font-bold text-gompa-slate">
                        {formatPrice(order.total, order.restaurant.currency)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
                      {timeAgo(order.createdAt)}
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
                        <div className="border-t border-brand-100 bg-brand-50/30 px-4 py-3 space-y-3">
                          {/* Order items */}
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-gray-400 uppercase">Items</p>
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gompa-slate">{item.quantity}x {item.name}</span>
                                  <span className="font-medium text-gompa-slate tabular-nums">
                                    {formatPrice(item.price * item.quantity, order.restaurant.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-gray-400">Subtotal</span>
                              <p className="font-medium text-gompa-slate">{formatPrice(order.subtotal, order.restaurant.currency)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Tax</span>
                              <p className="font-medium text-gompa-slate">{formatPrice(order.tax, order.restaurant.currency)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Total</span>
                              <p className="font-bold text-gompa-slate">{formatPrice(order.total, order.restaurant.currency)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Payment</span>
                              <p className="font-medium text-gompa-slate">
                                {order.payment ? `${order.payment.method} (${order.payment.status})` : "None"}
                              </p>
                            </div>
                            {order.deliveryAddress && (
                              <div className="col-span-2 sm:col-span-4">
                                <span className="text-gray-400">Delivery Address</span>
                                <p className="font-medium text-gompa-slate">{order.deliveryAddress}</p>
                              </div>
                            )}
                            <div className="col-span-2 sm:col-span-4">
                              <span className="text-gray-400">Created</span>
                              <p className="font-medium text-gompa-slate">{new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Status Actions */}
                          {nextStatus[order.status] && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => updateOrderStatus(order.id, nextStatus[order.status])}
                                disabled={updating === order.id}
                                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-brand-600 disabled:opacity-50"
                              >
                                {updating === order.id ? "Updating..." : `Move to ${nextStatus[order.status]}`}
                              </button>
                              {order.status !== "CANCELLED" && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                                  disabled={updating === order.id}
                                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-200 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
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
