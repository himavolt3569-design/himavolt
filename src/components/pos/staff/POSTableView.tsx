"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Users, Clock } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface TableData {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isActive: boolean;
  session?: {
    id: string;
    isActive: boolean;
    startedAt: string;
    order?: {
      id: string;
      orderNo: string;
      status: string;
      total: number;
      guestName: string | null;
      payment?: { status: string } | null;
    } | null;
  } | null;
}

interface Props {
  restaurantId: string;
  currency: string;
  onTableSelect: (tableNo: number) => void;
}

async function staffFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function getTableStatus(table: TableData): "available" | "occupied" | "needs_billing" {
  if (!table.session?.isActive) return "available";
  const order = table.session.order;
  if (!order) return "occupied";
  if (order.status === "DELIVERED" && (!order.payment || order.payment.status !== "COMPLETED")) return "needs_billing";
  return "occupied";
}

const STATUS_STYLES = {
  available:     { card: "border-gray-200 bg-white hover:border-[#eaa94d] hover:bg-[#fef9ef]/50",  dot: "bg-[#eaa94d]", label: "Available" },
  occupied:      { card: "border-amber-200 bg-amber-50/60 hover:border-amber-300",                dot: "bg-amber-500", label: "Occupied" },
  needs_billing: { card: "border-red-200 bg-red-50/60 hover:border-red-300",                      dot: "bg-red-500",   label: "Needs Billing" },
};

export default function POSTableView({ restaurantId, currency, onTableSelect }: Props) {
  const [tables, setTables] = useState<TableData[]>([]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await staffFetch<{ tables?: TableData[] } | TableData[]>(`/api/restaurants/${restaurantId}/tables`);
      const raw = Array.isArray(data) ? data : data.tables ?? [];
      setTables(raw);
    } catch {
      // silent
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
    const id = setInterval(fetchTables, 30000);
    return () => clearInterval(id);
  }, [fetchTables]);

  const timeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Table Overview</h2>
            <div className="flex items-center gap-4 mt-2">
              {Object.entries(STATUS_STYLES).map(([key, s]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={fetchTables}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Table grid — renders immediately, populates as data arrives */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {tables.map((table) => {
            const status = getTableStatus(table);
            const styles = STATUS_STYLES[status];
            return (
              <motion.button
                key={table.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTableSelect(table.tableNo)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all shadow-sm ${styles.card}`}
              >
                <span className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full ${styles.dot}`} />
                <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{table.tableNo}</p>
                {table.label && (
                  <p className="text-[10px] text-gray-400 truncate mb-1.5">{table.label}</p>
                )}
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity}</span>
                </div>
                {table.session?.isActive && (
                  <div className="mt-2 space-y-0.5">
                    {table.session.order && (
                      <>
                        <p className="text-[11px] font-semibold text-gray-700">#{table.session.order.orderNo}</p>
                        <p className="text-[11px] font-bold text-amber-700">
                          {formatPrice(table.session.order.total, currency)}
                        </p>
                      </>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{timeSince(table.session.startedAt)}</span>
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
