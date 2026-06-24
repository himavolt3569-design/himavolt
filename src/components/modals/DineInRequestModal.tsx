"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  CheckCircle2,
  XCircle,
  ChefHat,
  Clock,
  MapPin,
  MessageSquare,
  Wallet,
  Banknote,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { type LiveOrder } from "@/context/LiveOrdersContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";

export default function DineInRequestModal({
  order,
  onClose,
  onAccept,
  onReject,
  onPrintKOT,
  currency = "NPR",
}: {
  order: LiveOrder | null;
  onClose: () => void;
  /** print=true forces the kitchen ticket regardless of the auto-print setting. */
  onAccept: (id: string, print?: boolean) => void;
  onReject: (id: string, reason?: string) => void;
  /** Re-print the kitchen ticket for an already-accepted order. */
  onPrintKOT?: () => void;
  currency?: string;
}) {
  const { showToast } = useToast();
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");


  const handlePrint = () => {
    if (onPrintKOT) {
      onPrintKOT();
      showToast("Sent to printer!");
    } else {
      showToast("Printing is not available here");
    }
  };

  const handleAcceptPrint = () => {
    if (!order) return;
    onAccept(order.id, true);
    showToast("Order accepted & sent to printer!");
  };

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
          />

          {/* Panel — slides up from bottom on mobile, centered on desktop */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-[var(--canvas)] shadow-2xl md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-soft)]">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`flex h-2.5 w-2.5 rounded-full ${
                      order.status === "PENDING" ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--text-1)]"
                    }`}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                    {order.status === "PENDING" ? "New Dine-In Request" : `Order ${order.status}`}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">{order.orderNo}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--text-1)]/10">
                  <MapPin className="h-4.5 w-4.5 text-[var(--text-1)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-3)] font-medium">Table</p>
                  <p className="text-base font-extrabold text-[var(--text-1)]">#{order.tableNo}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-[var(--surface-alt)]" />
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                  <Clock className="h-4.5 w-4.5 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-3)] font-medium">Placed</p>
                  <p className="text-sm font-bold text-[var(--text-1)]">
                    {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m ago
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-[var(--surface-alt)]" />
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
                  <ChefHat className="h-4.5 w-4.5 text-[var(--accent-text)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-3)] font-medium">Total</p>
                  <p className="text-sm font-extrabold text-[var(--text-1)]">{formatPrice(order.total, currency)}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[220px] overflow-y-auto">
              <h3 className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
                Order Items
              </h3>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-[var(--canvas-sub)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[11px] font-black text-[var(--accent)]">
                        {item.quantity}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-1)]">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-2)]">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sub-total */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                <span className="text-sm font-bold text-[var(--text-1)]">Total</span>
                <span className="text-lg font-extrabold text-[var(--accent)]">{formatPrice(order.total, currency)}</span>
              </div>
            </div>

            {order.payment && (
              <div className="mx-6 mb-3 flex items-center gap-2 rounded-xl bg-[var(--canvas-sub)] border border-[var(--border)] px-4 py-3">
                {order.payment.method === "ESEWA" && <Wallet className="h-4 w-4 text-[var(--accent-text)]" />}
                {order.payment.method === "KHALTI" && <Wallet className="h-4 w-4 text-purple-600" />}
                {order.payment.method === "BANK" && <Banknote className="h-4 w-4 text-blue-600" />}
                {order.payment.method === "CASH" && <DollarSign className="h-4 w-4 text-[var(--text-2)]" />}
                {!["ESEWA", "KHALTI", "BANK", "CASH"].includes(order.payment.method) && <CreditCard className="h-4 w-4 text-[var(--text-2)]" />}
                <span className="text-sm font-bold text-[var(--text-1)]">
                  {order.payment.method === "ESEWA" ? "eSewa" : order.payment.method === "KHALTI" ? "Khalti" : order.payment.method === "BANK" ? "Bank Transfer" : "Cash"}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    order.payment.status === "COMPLETED"
                      ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                      : "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  }`}
                >
                  {order.payment.status === "COMPLETED" ? "Paid" : "Pending"}
                </span>
              </div>
            )}

            {order.note && (
              <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
                <MessageSquare className="h-4 w-4 text-[var(--accent-text)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider mb-0.5">
                    Customer Note
                  </p>
                  <p className="text-xs text-[var(--accent-text)] italic">&ldquo;{order.note}&rdquo;</p>
                </div>
              </div>
            )}

            <div className="px-6 pb-6 pt-2 space-y-2">
              {order.status === "PENDING" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAcceptPrint}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--text-1)] py-3.5 text-sm font-bold text-white hover:bg-[#2d1508] transition-all active:scale-[0.98]"
                    >
                      <Printer className="h-4 w-4" />
                      Accept & Print
                    </button>
                    <button
                      onClick={() => { onAccept(order.id); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Order
                    </button>
                  </div>
                  {showRejectReason ? (
                    <div className="flex flex-col gap-2">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 text-black dark:text-white bg-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onReject(order.id, rejectReason);
                            onClose();
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-3.5 text-sm font-bold text-white hover:bg-red-600 transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRejectReason(false)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--surface)] py-3.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRejectReason(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Order
                    </button>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--surface)] py-3.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    Print Receipt
                  </button>
                  <button
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--text-1)] py-3.5 text-sm font-bold text-white hover:bg-[#2d1508] transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
