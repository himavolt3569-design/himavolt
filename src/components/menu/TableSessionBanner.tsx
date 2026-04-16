"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface TableSessionBannerProps {
  tableNo: number;
  itemCount: number;
  total: number;
  status: string;
  currency?: string;
}

export default function TableSessionBanner({
  tableNo,
  itemCount,
  total,
  status,
  currency = "NPR",
}: TableSessionBannerProps) {
  const statusColor =
    status === "PREPARING"
      ? "bg-[var(--accent)]"
      : status === "READY"
        ? "bg-[#eaa94d]"
        : status === "ACCEPTED"
          ? "bg-blue-500"
          : "bg-[var(--accent)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] ring-1 ring-[var(--accent-border)]/50 px-4 py-2.5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
          <UtensilsCrossed className="h-4 w-4 text-[var(--accent-text)]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--accent-text)]">Table {tableNo}</p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--accent-text)]">
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            <span className="capitalize">{status.toLowerCase()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div>
          <p className="text-sm font-bold text-[var(--accent-text)]">{formatPrice(total, currency)}</p>
          <p className="text-[10px] text-[var(--accent)] flex items-center gap-0.5 justify-end">
            <ShoppingBag className="h-2.5 w-2.5" />
            {itemCount} items
          </p>
        </div>
      </div>
    </motion.div>
  );
}
