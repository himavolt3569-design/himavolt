"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";

interface TableSessionBannerProps {
  tableNo: number;
  itemCount: number;
  total: number;
  status: string;
}

export default function TableSessionBanner({
  tableNo,
  itemCount,
  total,
  status,
}: TableSessionBannerProps) {
  const statusColor =
    status === "PREPARING"
      ? "bg-orange-500"
      : status === "READY"
        ? "bg-green-500"
        : status === "ACCEPTED"
          ? "bg-blue-500"
          : "bg-amber-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200/50 px-4 py-2.5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <UtensilsCrossed className="h-4 w-4 text-amber-700" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-900">Table {tableNo}</p>
          <div className="flex items-center gap-2 text-[10px] text-amber-600">
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            <span className="capitalize">{status.toLowerCase()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div>
          <p className="text-sm font-bold text-amber-900">Rs. {total.toLocaleString()}</p>
          <p className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
            <ShoppingBag className="h-2.5 w-2.5" />
            {itemCount} items
          </p>
        </div>
      </div>
    </motion.div>
  );
}
