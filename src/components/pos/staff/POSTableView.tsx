"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Users, Clock, Receipt } from "lucide-react";
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

const STATUS_COLORS = {
  available: "bg-green-50 border-green-300 hover:bg-green-100",
  occupied: "bg-amber-50 border-amber-300 hover:bg-amber-100",
  needs_billing: "bg-red-50 border-red-300 hover:bg-red-100",
};

const STATUS_DOT = {
  available: "bg-green-500",
  occupied: "bg-amber-500",
  needs_billing: "bg-red-500",
};

export default function POSTableView({ restaurantId, currency, onTableSelect }: Props) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const data = await staffFetch<{ tables?: TableData[] } | TableData[]>(`/api/restaurants/${restaurantId}/tables`);
      const raw = Array.isArray(data) ? data : data.tables ?? [];
      setTables(raw);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
    const id = setInterval(fetchTables, 10000);
    return () => clearInterval(id);
  }, [fetchTables]);

  const timeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Table Overview</h2>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-500" /> Occupied</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500" /> Needs Billing</span>
          </div>
        </div>
        <button
          onClick={fetchTables}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-gray-100 h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            return (
              <motion.button
                key={table.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTableSelect(table.tableNo)}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all ${STATUS_COLORS[status]}`}
              >
                <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />

                <p className="text-2xl font-black text-gray-900">{table.tableNo}</p>
                {table.label && <p className="text-[10px] text-gray-500 truncate">{table.label}</p>}

                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity}</span>
                </div>

                {table.session?.isActive && (
                  <div className="mt-2 space-y-1">
                    {table.session.order && (
                      <>
                        <p className="text-[10px] font-bold text-gray-700">
                          #{table.session.order.orderNo}
                        </p>
                        <p className="text-[10px] font-bold text-amber-700">
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
      )}
    </div>
  );
}
