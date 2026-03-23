"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

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
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PICKED_UP: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (statusFilter !== "All") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/deliveries?${params}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setDeliveries(data.deliveries);
        setPagination(data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter],
  );

  useEffect(() => {
    fetchDeliveries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchDeliveries(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => fetchDeliveries(page), 10000);
    return () => clearInterval(interval);
  }, [fetchDeliveries, page]);

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
              }`}
            >
              {s === "All" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchDeliveries(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-gray-400">{pagination.total} deliveries</span>
        )}
      </div>

      {/* Deliveries List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand-400" />
            <span className="text-xs font-semibold text-gray-500">Deliveries</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            Auto-refresh
          </div>
        </div>

        {loading && deliveries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No deliveries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deliveries.map((delivery) => {
              const StatusIcon = STATUS_ICONS[delivery.status] || Clock;
              const isExpanded = expandedId === delivery.id;
              return (
                <div key={delivery.id} className="transition-all hover:bg-brand-50/40">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className={`flex-shrink-0 rounded-lg p-2 ${STATUS_COLORS[delivery.status] || "bg-gray-100 text-gray-600"}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gompa-slate">
                          Order #{delivery.order.orderNo}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[delivery.status]}`}>
                          {delivery.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{delivery.order.restaurant.name}</span>
                        {delivery.driver && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {delivery.driver.name}
                            <span className={`ml-0.5 inline-flex h-1.5 w-1.5 rounded-full ${delivery.driver.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                          </span>
                        )}
                        {delivery.distanceKm && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{delivery.distanceKm.toFixed(1)} km</span>
                        )}
                      </div>
                    </div>
                    <div className="hidden flex-shrink-0 text-right sm:block">
                      {delivery.fee != null && (
                        <p className="text-sm font-bold text-gompa-slate">{formatPrice(delivery.fee, "NPR")}</p>
                      )}
                      {delivery.estimatedMinutes && (
                        <p className="text-[11px] text-gray-400">~{delivery.estimatedMinutes} min</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
                      {timeAgo(delivery.createdAt)}
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
                            {delivery.driver && (
                              <>
                                <div>
                                  <span className="text-gray-400">Driver</span>
                                  <p className="font-medium text-gompa-slate">{delivery.driver.name}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Driver Phone</span>
                                  <p className="font-medium text-gompa-slate">{delivery.driver.phone}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Vehicle</span>
                                  <p className="font-medium text-gompa-slate">{delivery.driver.vehicleType} - {delivery.driver.vehicleNo}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Driver Status</span>
                                  <p className={`font-medium ${delivery.driver.isOnline ? "text-green-600" : "text-gray-400"}`}>
                                    {delivery.driver.isOnline ? "Online" : "Offline"}
                                  </p>
                                </div>
                              </>
                            )}
                            <div>
                              <span className="text-gray-400">Customer</span>
                              <p className="font-medium text-gompa-slate">{delivery.order.user?.name || "Guest"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Order Total</span>
                              <p className="font-bold text-gompa-slate">{formatPrice(delivery.order.total, "NPR")}</p>
                            </div>
                            {delivery.order.deliveryAddress && (
                              <div className="col-span-2 sm:col-span-4">
                                <span className="text-gray-400">Delivery Address</span>
                                <p className="font-medium text-gompa-slate">{delivery.order.deliveryAddress}</p>
                              </div>
                            )}
                            {delivery.order.deliveryPhone && (
                              <div>
                                <span className="text-gray-400">Delivery Phone</span>
                                <p className="font-medium text-gompa-slate">{delivery.order.deliveryPhone}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400">Distance</span>
                              <p className="font-medium text-gompa-slate">{delivery.distanceKm ? `${delivery.distanceKm.toFixed(1)} km` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Est. Time</span>
                              <p className="font-medium text-gompa-slate">{delivery.estimatedMinutes ? `${delivery.estimatedMinutes} min` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Actual Time</span>
                              <p className="font-medium text-gompa-slate">{delivery.actualMinutes ? `${delivery.actualMinutes} min` : "—"}</p>
                            </div>
                            {delivery.pickedUpAt && (
                              <div>
                                <span className="text-gray-400">Picked Up</span>
                                <p className="font-medium text-gompa-slate">{new Date(delivery.pickedUpAt).toLocaleString()}</p>
                              </div>
                            )}
                            {delivery.deliveredAt && (
                              <div>
                                <span className="text-gray-400">Delivered</span>
                                <p className="font-medium text-gompa-slate">{new Date(delivery.deliveredAt).toLocaleString()}</p>
                              </div>
                            )}
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
