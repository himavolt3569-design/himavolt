"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Printer, X, CheckCircle2, Receipt } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import type { LiveOrder } from "@/context/LiveOrdersContext";

/**
 * The receipt that appears in the orders list the moment an order is accepted.
 *
 * The point of this panel is that staff never leave the orders screen to print.
 * Before it existed, accepting an order told you nothing and printing meant
 * navigating to Billing, finding the order again, and printing from there —
 * which is exactly why orders sat unaccepted while staff camped on Billing.
 *
 * Figures come straight off the live order (already in memory, so the panel
 * paints instantly with no fetch). The PRINTED document is rendered server-side
 * from the `Bill` record and remains the authoritative one — this is a
 * confirmation and a print launcher, not a source of truth.
 */

interface Props {
  order: LiveOrder | null;
  currency: string;
  onDismiss: () => void;
  /** Owned by the parent so printing uses the instant in-memory renderer. */
  onPrint: (orderId: string) => void;
}

export default function AcceptedReceiptPanel({
  order,
  currency,
  onDismiss,
  onPrint,
}: Props) {
  const isPaid = order?.payment?.status === "COMPLETED";

  return (
    <AnimatePresence>
      {order && (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)]/50 p-4 sm:p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-[var(--text-1)] truncate">
                    Order accepted · {order.orderNo}
                  </p>
                  <p className="text-[11.5px] font-medium text-[var(--text-2)]">
                    {order.tableNo
                      ? `Table ${order.tableNo}`
                      : order.roomNo
                        ? `Room ${order.roomNo}`
                        : order.type.replace("_", " ")}
                    {" · "}
                    {isPaid ? "Paid" : "Unpaid"}
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                aria-label="Dismiss receipt"
                className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--canvas)] hover:text-[var(--text-1)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            <div className="rounded-xl bg-[var(--canvas)] px-4 py-3 space-y-1.5">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 text-[12.5px]"
                >
                  <span className="min-w-0 text-[var(--text-2)]">
                    <span className="font-bold text-[var(--text-1)]">
                      {item.quantity}×
                    </span>{" "}
                    {item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-[var(--text-1)] tabular-nums">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
              ))}

              <div className="border-t border-dashed border-[var(--border)] mt-2.5 pt-2.5 space-y-1">
                <div className="flex justify-between text-[12px] text-[var(--text-2)]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatPrice(order.subtotal, currency)}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-[12px] text-[var(--text-2)]">
                    <span>Tax</span>
                    <span className="tabular-nums">
                      {formatPrice(order.tax, currency)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[13px] font-extrabold text-[var(--text-1)]">
                    {isPaid ? "Total" : "Amount due"}
                  </span>
                  <span className="text-[17px] font-black text-[var(--text-1)] tabular-nums">
                    {formatPrice(order.total, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onPrint(order.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
              >
                <Printer className="h-4 w-4" />
                {isPaid ? "Print receipt" : "Print bill"}
              </button>
              <button
                onClick={onDismiss}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-5 py-3 text-[13px] font-bold text-[var(--text-2)] transition-colors hover:bg-[var(--canvas-sub)]"
              >
                Done
              </button>
            </div>

            {!isPaid && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-3)]">
                <Receipt className="h-3 w-3 shrink-0" />
                Prints as an unpaid bill. The numbered receipt is issued once
                payment is collected.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
