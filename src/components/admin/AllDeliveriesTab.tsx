"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Truck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Phone,
  User,
  Store,
  Clock,
  CheckCircle2,
  Package,
  Navigation,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface Delivery {
  id: string;
  status: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropLat: number | null;
  dropLng: number | null;
  distanceKm: number | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  fee: number | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNo: string;
    isOnline: boolean;
  } | null;
  order: {
    id: string;
    orderNo: string;
    total: number;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    restaurant: { id: string; name: string; slug: string };
    user: { id: string; name: string } | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DELIVERY_STATUSES = ["All", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PICKED_UP: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  ASSIGNED: User,
  PICKED_UP: Package,
  IN_TRANSIT: Navigation,
  DELIVERED: CheckCircle2,
  CANCELLED: Clock,
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

export default function AllDeliveriesTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const deliveriesQueryKey = ["admin-deliveries", page, statusFilter] as const;
  const deliveriesQuery = useQuery({
    queryKey: deliveriesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/deliveries?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return { deliveries: data.deliveries as Delivery[], pagination: data.pagination as Pagination };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });
  const deliveries = deliveriesQuery.data?.deliveries ?? [];
  const pagination = deliveriesQuery.data?.pagination ?? null;
  const loading = deliveriesQuery.isLoading;

  const allSelected = deliveries.length > 0 && selectedIds.size === deliveries.length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/deliveries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId: deleteTarget.id }),
      });
      if (res.ok) {
        queryClient.setQueryData<typeof deliveriesQuery.data>(deliveriesQueryKey, (prev) =>
          prev
            ? {
                deliveries: prev.deliveries.filter((d) => d.id !== deleteTarget.id),
                pagination: prev.pagination ? { ...prev.pagination, total: prev.pagination.total - 1 } : prev.pagination,
              }
            : prev,
        );
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
      const res = await fetch("/api/admin/deliveries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        queryClient.setQueryData<typeof deliveriesQuery.data>(deliveriesQueryKey, (prev) =>
          prev
            ? {
                deliveries: prev.deliveries.filter((d) => !selectedIds.has(d.id)),
                pagination: prev.pagination ? { ...prev.pagination, total: prev.pagination.total - selectedIds.size } : prev.pagination,
              }
            : prev,
        );
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-[var(--text-1)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
              }`}
            >
              {s === "All" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] })}
          className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-[var(--text-3)]">{pagination.total} deliveries</span>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5">
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

      <div className="overflow-hidden rounded-3xl border border-[var(--accent-muted)] bg-[var(--canvas)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--accent-muted)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedIds(allSelected ? new Set() : new Set(deliveries.map((d) => d.id)))}
              className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
            />
            <Truck className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-2)]">Deliveries</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent-text)]">
          <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </span>
            Auto-refresh
          </div>
        </div>

        {loading && deliveries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="mx-auto mb-2 h-8 w-8 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No deliveries found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {deliveries.map((delivery) => {
              const StatusIcon = STATUS_ICONS[delivery.status] || Clock;
              const isExpanded = expandedId === delivery.id;
              const isSelected = selectedIds.has(delivery.id);
              return (
                <div key={delivery.id} className={`transition-all hover:bg-[var(--accent-muted)]/40 ${isSelected ? "bg-red-50/30" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(delivery.id)) next.delete(delivery.id); else next.add(delivery.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 flex-shrink-0 rounded accent-[var(--accent)]"
                    />
                    <div className={`flex-shrink-0 rounded-lg p-2 ${STATUS_COLORS[delivery.status] || "bg-[var(--surface)] text-[var(--text-2)]"}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-1)]">
                          Order #{delivery.order.orderNo}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[delivery.status]}`}>
                          {delivery.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{delivery.order.restaurant.name}</span>
                        {delivery.driver && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {delivery.driver.name}
                            <span className={`ml-0.5 inline-flex h-1.5 w-1.5 rounded-full ${delivery.driver.isOnline ? "bg-[var(--accent)]" : "bg-[var(--text-3)]"}`} />
                          </span>
                        )}
                        {delivery.distanceKm && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{delivery.distanceKm.toFixed(1)} km</span>
                        )}
                      </div>
                    </div>
                    <div className="hidden flex-shrink-0 text-right sm:block">
                      {delivery.fee != null && (
                        <p className="text-sm font-bold text-[var(--text-1)]">{formatPrice(delivery.fee, "NPR")}</p>
                      )}
                      {delivery.estimatedMinutes && (
                        <p className="text-[11px] text-[var(--text-3)]">~{delivery.estimatedMinutes} min</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-[var(--text-3)] tabular-nums">
                      {timeAgo(delivery.createdAt)}
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
                        <div className="border-t border-[var(--accent-muted)] bg-[var(--accent-muted)]/30 px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            {delivery.driver && (
                              <>
                                <div>
                                  <span className="text-[var(--text-3)]">Driver</span>
                                  <p className="font-medium text-[var(--text-1)]">{delivery.driver.name}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--text-3)]">Driver Phone</span>
                                  <p className="font-medium text-[var(--text-1)]">{delivery.driver.phone}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--text-3)]">Vehicle</span>
                                  <p className="font-medium text-[var(--text-1)]">{delivery.driver.vehicleType} - {delivery.driver.vehicleNo}</p>
                                </div>
                                <div>
                                  <span className="text-[var(--text-3)]">Driver Status</span>
                                  <p className={`font-medium ${delivery.driver.isOnline ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`}>
                                    {delivery.driver.isOnline ? "Online" : "Offline"}
                                  </p>
                                </div>
                              </>
                            )}
                            <div>
                              <span className="text-[var(--text-3)]">Customer</span>
                              <p className="font-medium text-[var(--text-1)]">{delivery.order.user?.name || "Guest"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Order Total</span>
                              <p className="font-bold text-[var(--text-1)]">{formatPrice(delivery.order.total, "NPR")}</p>
                            </div>
                            {delivery.order.deliveryAddress && (
                              <div className="col-span-2 sm:col-span-4">
                                <span className="text-[var(--text-3)]">Delivery Address</span>
                                <p className="font-medium text-[var(--text-1)]">{delivery.order.deliveryAddress}</p>
                              </div>
                            )}
                            {delivery.order.deliveryPhone && (
                              <div>
                                <span className="text-[var(--text-3)]">Delivery Phone</span>
                                <p className="font-medium text-[var(--text-1)]">{delivery.order.deliveryPhone}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-[var(--text-3)]">Distance</span>
                              <p className="font-medium text-[var(--text-1)]">{delivery.distanceKm ? `${delivery.distanceKm.toFixed(1)} km` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Est. Time</span>
                              <p className="font-medium text-[var(--text-1)]">{delivery.estimatedMinutes ? `${delivery.estimatedMinutes} min` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Actual Time</span>
                              <p className="font-medium text-[var(--text-1)]">{delivery.actualMinutes ? `${delivery.actualMinutes} min` : "—"}</p>
                            </div>
                            {delivery.pickedUpAt && (
                              <div>
                                <span className="text-[var(--text-3)]">Picked Up</span>
                                <p className="font-medium text-[var(--text-1)]">{new Date(delivery.pickedUpAt).toLocaleString()}</p>
                              </div>
                            )}
                            {delivery.deliveredAt && (
                              <div>
                                <span className="text-[var(--text-3)]">Delivered</span>
                                <p className="font-medium text-[var(--text-1)]">{new Date(delivery.deliveredAt).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                          <div className="pt-1">
                            <button
                              onClick={() => setDeleteTarget(delivery)}
                              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Record
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
        title="Delete delivery record?"
        description={`This will permanently delete the delivery record for order #${deleteTarget?.order.orderNo}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} delivery record${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} delivery record${selectedIds.size > 1 ? "s" : ""}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
