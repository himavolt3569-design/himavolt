"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Radio,
  X,
  Eye,
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  CreditCard,
  AlertCircle,
  Users,
  UserPlus,
  Store,
  Package,
  Utensils,
  LogIn,
  LogOut,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  userId: string | null;
  restaurantId: string | null;
  user: { name: string; email: string; imageUrl: string | null } | null;
  restaurant: { name: string; slug: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  ORDER_CREATED: ShoppingBag,
  ORDER_ACCEPTED: CheckCircle2,
  ORDER_PREPARING: Clock,
  ORDER_READY: CheckCircle2,
  ORDER_DELIVERED: Truck,
  ORDER_CANCELLED: XCircle,
  ORDER_REJECTED: XCircle,
  MENU_ITEM_CREATED: Utensils,
  MENU_ITEM_UPDATED: Utensils,
  MENU_ITEM_DELETED: Utensils,
  CATEGORY_CREATED: Utensils,
  STAFF_ADDED: UserPlus,
  STAFF_REMOVED: Users,
  STAFF_UPDATED: Users,
  STAFF_LOGIN: LogIn,
  STAFF_LOGOUT: LogOut,
  STAFF_CHECKIN: LogIn,
  STAFF_CHECKOUT: LogOut,
  PAYMENT_INITIATED: CreditCard,
  PAYMENT_COMPLETED: CreditCard,
  PAYMENT_FAILED: AlertCircle,
  PAYMENT_COLLECTED: CreditCard,
  BILL_CREATED: CreditCard,
  DISCOUNT_APPLIED: CreditCard,
  RESTAURANT_CREATED: Store,
  RESTAURANT_UPDATED: Store,
  RESTAURANT_DELETED: Store,
  INVENTORY_ADDED: Package,
  INVENTORY_UPDATED: Package,
  INVENTORY_DELETED: Package,
  DELIVERY_ASSIGNED: Truck,
  DELIVERY_STATUS_UPDATED: Truck,
  USER_CREATED: UserPlus,
  USER_UPDATED: Users,
  USER_DELETED: Users,
};

const ACTION_COLORS: Record<string, string> = {
  ORDER_CREATED: "text-blue-600 bg-blue-50",
  ORDER_ACCEPTED: "text-emerald-600 bg-emerald-50",
  ORDER_PREPARING: "text-amber-600 bg-amber-50",
  ORDER_READY: "text-green-600 bg-green-50",
  ORDER_DELIVERED: "text-green-700 bg-green-50",
  ORDER_CANCELLED: "text-red-600 bg-red-50",
  ORDER_REJECTED: "text-red-600 bg-red-50",
  MENU_ITEM_CREATED: "text-purple-600 bg-purple-50",
  MENU_ITEM_UPDATED: "text-purple-600 bg-purple-50",
  MENU_ITEM_DELETED: "text-red-500 bg-red-50",
  STAFF_ADDED: "text-indigo-600 bg-indigo-50",
  STAFF_REMOVED: "text-red-500 bg-red-50",
  STAFF_LOGIN: "text-teal-600 bg-teal-50",
  STAFF_LOGOUT: "text-gray-500 bg-gray-100",
  PAYMENT_COMPLETED: "text-green-600 bg-green-50",
  PAYMENT_FAILED: "text-red-600 bg-red-50",
  RESTAURANT_CREATED: "text-saffron-flame bg-orange-50",
  RESTAURANT_UPDATED: "text-saffron-flame bg-orange-50",
  INVENTORY_ADDED: "text-cyan-600 bg-cyan-50",
  INVENTORY_UPDATED: "text-cyan-600 bg-cyan-50",
  USER_CREATED: "text-indigo-600 bg-indigo-50",
};

const ENTITY_FILTERS = [
  "All",
  "Order",
  "MenuItem",
  "StaffMember",
  "Payment",
  "Restaurant",
  "InventoryItem",
  "Delivery",
  "User",
];

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function AuditRow({ log, isNew }: { log: AuditLog; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ACTION_ICONS[log.action] ?? Activity;
  const colorClass = ACTION_COLORS[log.action] ?? "text-gray-500 bg-gray-100";

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -20, scale: 0.98 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={`group border-b border-gray-50 transition-all hover:bg-brand-50/60 ${isNew ? "bg-brand-100/30" : ""}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`flex-shrink-0 rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gompa-slate">{formatAction(log.action)}</span>
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                NEW
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            {log.detail ?? `${log.entity} ${log.entityId ? `#${log.entityId.slice(-6)}` : ""}`}
          </p>
        </div>
        <div className="hidden flex-shrink-0 text-right sm:block">
          {log.user && <p className="text-xs font-medium text-gray-600">{log.user.name}</p>}
          {log.restaurant && <p className="text-[11px] text-gray-400">{log.restaurant.name}</p>}
        </div>
        <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">{timeAgo(log.createdAt)}</span>
        <Eye className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 group-hover:text-brand-400" />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-brand-100 bg-brand-50/30 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-gray-400">Entity</span>
                  <p className="font-medium text-gompa-slate">{log.entity}</p>
                </div>
                <div>
                  <span className="text-gray-400">Entity ID</span>
                  <p className="font-mono text-gompa-slate">{log.entityId ? `...${log.entityId.slice(-8)}` : "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">User</span>
                  <p className="font-medium text-gompa-slate">{log.user?.email ?? "System"}</p>
                </div>
                <div>
                  <span className="text-gray-400">IP Address</span>
                  <p className="font-mono text-gompa-slate">{log.ipAddress ?? "—"}</p>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-gray-400">Timestamp</span>
                  <p className="font-medium text-gompa-slate">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                {log.metadata && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-gray-400">Metadata</span>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-gompa-slate p-2 text-[11px] text-green-300">
                      {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchLogs = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (entityFilter !== "All") params.set("entity", entityFilter);

        const res = await fetch(`/api/admin/audit?${params}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, search, entityFilter],
  );

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityFilter]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // SSE for live updates
  useEffect(() => {
    if (!liveEnabled) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const es = new EventSource("/api/admin/audit/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "logs" && data.logs?.length > 0) {
          setLogs((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            const incoming = (data.logs as AuditLog[]).filter((l) => !existing.has(l.id));
            if (incoming.length === 0) return prev;
            setNewLogIds((ids) => new Set([...ids, ...incoming.map((l) => l.id)]));
            setTimeout(() => {
              setNewLogIds((ids) => {
                const next = new Set(ids);
                incoming.forEach((l) => next.delete(l.id));
                return next;
              });
            }, 5000);
            return [...incoming, ...prev].slice(0, 50);
          });
          setPagination((p) => (p ? { ...p, total: p.total + data.logs.length } : p));
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (liveEnabled) {
          setLiveEnabled(false);
          setTimeout(() => setLiveEnabled(true), 100);
        }
      }, 5000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [liveEnabled]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search audit logs..."
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
            showFilters || entityFilter !== "All"
              ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
              : "border-gray-200 text-gray-600 hover:bg-brand-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => setLiveEnabled((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            liveEnabled
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {liveEnabled ? "Live" : "Paused"}
        </button>
        <button
          onClick={() => fetchLogs(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {ENTITY_FILTERS.map((e) => (
                <button
                  key={e}
                  onClick={() => { setEntityFilter(e); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    entityFilter === e ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-400" />
            <span className="text-xs font-semibold text-gray-500">Activity Feed</span>
            {pagination && (
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                {pagination.total.toLocaleString()} total
              </span>
            )}
          </div>
          {liveEnabled && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Streaming
            </div>
          )}
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No audit events found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <AuditRow key={log.id} log={log} isNew={newLogIds.has(log.id)} />
            ))}
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
