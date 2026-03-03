"use client";

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

export default function DineInRequestModal({
  order,
  onClose,
  onAccept,
  onReject,
}: {
  order: LiveOrder | null;
  onClose: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { showToast } = useToast();

  const handlePrint = () => {
    showToast("Sent to printer!");
  };

  const handleAcceptPrint = () => {
    if (!order) return;
    onAccept(order.id);
    showToast("Order accepted & sent to printer!");
  };

  return (
    <AnimatePresence>
      {order && (
        <>
          {/* Overlay */}
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
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white shadow-2xl md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`flex h-2.5 w-2.5 rounded-full ${
                      order.status === "PENDING" ? "bg-[#FF9933] animate-pulse" : "bg-[#0A4D3C]"
                    }`}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {order.status === "PENDING" ? "New Dine-In Request" : `Order ${order.status}`}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#1F2A2A]">{order.orderNo}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info row */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A4D3C]/10">
                  <MapPin className="h-4.5 w-4.5 text-[#0A4D3C]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Table</p>
                  <p className="text-base font-extrabold text-[#1F2A2A]">#{order.tableNo}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF9933]/10">
                  <Clock className="h-4.5 w-4.5 text-[#FF9933]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Placed</p>
                  <p className="text-sm font-bold text-[#1F2A2A]">
                    {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m ago
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <ChefHat className="h-4.5 w-4.5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Total</p>
                  <p className="text-sm font-extrabold text-[#1F2A2A]">Rs. {order.total}</p>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div className="px-6 py-4 max-h-[220px] overflow-y-auto">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Order Items
              </h3>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF9933]/10 text-[11px] font-black text-[#FF9933]">
                        {item.quantity}
                      </span>
                      <span className="text-sm font-semibold text-[#1F2A2A]">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-500">
                      Rs. {item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sub-total */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm font-bold text-[#1F2A2A]">Total</span>
                <span className="text-lg font-extrabold text-[#FF9933]">Rs. {order.total}</span>
              </div>
            </div>

            {/* Payment info */}
            {order.payment && (
              <div className="mx-6 mb-3 flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                {order.payment.method === "ESEWA" && <Wallet className="h-4 w-4 text-green-600" />}
                {order.payment.method === "KHALTI" && <Wallet className="h-4 w-4 text-purple-600" />}
                {order.payment.method === "BANK" && <Banknote className="h-4 w-4 text-blue-600" />}
                {order.payment.method === "CASH" && <DollarSign className="h-4 w-4 text-gray-600" />}
                {!["ESEWA", "KHALTI", "BANK", "CASH"].includes(order.payment.method) && <CreditCard className="h-4 w-4 text-gray-600" />}
                <span className="text-sm font-bold text-[#1F2A2A]">
                  {order.payment.method === "ESEWA" ? "eSewa" : order.payment.method === "KHALTI" ? "Khalti" : order.payment.method === "BANK" ? "Bank Transfer" : "Cash"}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    order.payment.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {order.payment.status === "COMPLETED" ? "Paid" : "Pending"}
                </span>
              </div>
            )}

            {/* Note */}
            {order.note && (
              <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <MessageSquare className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
                    Customer Note
                  </p>
                  <p className="text-xs text-amber-800 italic">&ldquo;{order.note}&rdquo;</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-6 pb-6 pt-2 space-y-2">
              {order.status === "PENDING" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAcceptPrint}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] py-3.5 text-sm font-bold text-white hover:bg-[#083a2d] transition-all active:scale-[0.98]"
                    >
                      <Printer className="h-4 w-4" />
                      Accept & Print
                    </button>
                    <button
                      onClick={() => { onAccept(order.id); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FF9933] py-3.5 text-sm font-bold text-white hover:bg-[#ff8811] transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Order
                    </button>
                  </div>
                  <button
                    onClick={() => { onReject(order.id); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Order
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    Print Receipt
                  </button>
                  <button
                    onClick={onClose}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0A4D3C] py-3.5 text-sm font-bold text-white hover:bg-[#083a2d] transition-all"
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
