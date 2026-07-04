"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { adminTopic } from "@/lib/realtime-topics";
import {
  Search,
  CheckCircle2,
  XCircle,
  User,
  Store,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface AdminOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  roomNo: string | null;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  payment: { method: string; status: string; amount: number } | null;
  restaurant: { id: string; name: string; slug: string; currency: string } | null;
  user: { id: string; name: string | null; email: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrdersResponse {
  orders: AdminOrder[];
  pagination: Pagination | null;
}

const STATUS_THEMES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  PENDING: { bg: "bg-orange-50", text: "text-orange-500", icon: Clock },
  ACCEPTED: { bg: "bg-emerald-50", text: "text-emerald-500", icon: CheckCircle2 },
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
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", page, search, statusFilter] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      return {
        orders: data.orders || [],
        pagination: data.pagination ?? null,
      } as OrdersResponse;
    },
    placeholderData: keepPreviousData,
  });
  const orders = ordersQuery.data?.orders ?? [];
  const pagination = ordersQuery.data?.pagination ?? null;

  const refreshOrders = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  // Live refresh on any order change across all restaurants.
  useRealtimeSignal(adminTopic(), refreshOrders);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 500);
  };

  return (
    <div className="space-y-8">

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, users, restaurants..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {["All", "PENDING", "ACCEPTED", "REJECTED"].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                statusFilter === status
                ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20"
                : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {status === "All" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            onClick={refreshOrders}
            className="p-3 rounded-2xl bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Orders List ── */}
      <div className="grid gap-5">
        {orders.length === 0 && !ordersQuery.isFetching && (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
            <p className="text-gray-400 font-semibold">No orders found</p>
          </div>
        )}
        {orders.map((order) => {
          const theme = STATUS_THEMES[order.status] || STATUS_THEMES.PENDING;
          const currency = order.restaurant?.currency ?? "NPR";
          const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
          const expanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              onClick={() => setExpandedId(expanded ? null : order.id)}
              className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all group cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Icon */}
                <div className={`h-16 w-16 shrink-0 rounded-3xl flex items-center justify-center ${theme.bg}`}>
                  <theme.icon className={`h-7 w-7 ${theme.text}`} />
                </div>

                {/* Core Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="text-xl font-bold text-gray-900 tracking-tight">#{order.orderNo}</h4>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.bg} ${theme.text}`}>
                      {order.status}
                    </div>
                    {order.payment && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.payment.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-gray-50 text-gray-400"
                      }`}>
                        {order.payment.status === "COMPLETED" ? "Paid" : order.payment.method}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-gray-400">
                    <span className="flex items-center gap-1.5"><Store className="h-4 w-4" /> {order.restaurant?.name ?? "—"}</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-200 hidden md:block" />
                    <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {order.user?.name || order.user?.email || "Guest"}</span>
                    {order.tableNo != null && (
                      <span className="text-gray-300">Table {order.tableNo}</span>
                    )}
                    {order.roomNo && (
                      <span className="text-gray-300">Room {order.roomNo}</span>
                    )}
                  </div>
                </div>

                {/* Price & Meta */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(order.total, currency)}</p>
                  <p className="text-sm font-medium text-gray-400">{itemCount} Items • {timeAgo(order.createdAt)}</p>
                </div>

                {/* Expand */}
                <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--accent)] group-hover:text-white transition-all md:ml-4">
                  <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Expanded item detail */}
              {expanded && (
                <div className="mt-6 pt-6 border-t border-gray-100 grid gap-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">{it.quantity}× {it.name}</span>
                      <span className="font-bold text-gray-900">{formatPrice(it.price * it.quantity, currency)}</span>
                    </div>
                  ))}
                  {order.items.length === 0 && (
                    <p className="text-sm text-gray-400 font-medium">No line items</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(1, p - 1)); }}
            disabled={page <= 1}
            className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(pagination.totalPages, p + 1)); }}
            disabled={page >= pagination.totalPages}
            className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
