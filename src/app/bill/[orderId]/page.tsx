"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Printer,
  ArrowLeft,
  Receipt,
  CheckCircle2,
  CreditCard,
  Utensils,
  Calendar,
  Hash,
  MapPin,
  Phone,
  User,
  Clock,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import QRCode from "react-qr-code";

/* ── Types ──────────────────────────────────────────────────────── */

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  addOns: string | null;
}

interface BillPayment {
  method: string;
  status: string;
  amount: number;
  transactionId: string | null;
  paidAt: string | null;
}

interface BillData {
  id: string;
  billNo: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  paidVia: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNo: string;
    tableNo: number | null;
    restaurantId: string;
    status: string;
    type: string;
    note: string | null;
    createdAt: string;
    deliveredAt: string | null;
    items: BillItem[];
    restaurant: {
      name: string;
      address: string;
      phone: string;
      currency?: string;
    };
    user: {
      name: string | null;
      email: string;
      phone: string | null;
    } | null;
    payment: BillPayment | null;
  };
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-NP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(date: string) {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

function paymentLabel(method: string) {
  const map: Record<string, string> = {
    ESEWA: "eSewa",
    KHALTI: "Khalti",
    BANK: "Bank Transfer",
    CASH: "Cash",
    COUNTER: "Counter Pay",
    DIRECT: "Direct Pay",
  };
  return map[method] || method;
}

function statusColor(status: string) {
  if (status === "DELIVERED")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "CANCELLED" || status === "REJECTED")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

/* ── Print & Download ───────────────────────────────────────────── */

function handlePrint() {
  window.print();
}

async function handleDownload(
  billRef: React.RefObject<HTMLDivElement | null>,
  billNo: string,
) {
  // Dynamic import to avoid SSR issues
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  if (!billRef.current) return;

  const canvas = await html2canvas(billRef.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${billNo}.pdf`);
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function BillPage() {
  const params = useParams<{ orderId: string }>();
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orders/${params.orderId}/bill`);
        if (!res.ok) throw new Error("Bill not found");
        const data = await res.json();
        setBill(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bill");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.orderId]);

  const onDownload = useCallback(async () => {
    if (!bill) return;
    setDownloading(true);
    try {
      await handleDownload(billRef, bill.billNo);
    } finally {
      setDownloading(false);
    }
  }, [bill]);

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#eaa94d]" />
          <p className="text-sm font-medium text-gray-400">
            Generating your bill…
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────── */
  if (error || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-7 w-7 text-[#eaa94d]" />
          </div>
          <p className="text-lg font-bold text-[#3e1e0c]">Bill not found</p>
          <p className="text-sm text-gray-400">
            This order may not have a bill yet
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#eaa94d] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#eaa94d]/20"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  const { order } = bill;
  const cur = order.restaurant.currency ?? "NPR";
  const isPaid = order.payment?.status === "COMPLETED";
  const isOnlinePayment = order.payment && order.payment.method !== "CASH";
  const docLabel = isOnlinePayment ? "Payment Receipt" : "Invoice";
  const downloadLabel = isOnlinePayment
    ? "Download Receipt PDF"
    : "Download Bill PDF";
  const printLabel = isOnlinePayment ? "Print Receipt" : "Print Bill";

  /* ── Bill ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 print:bg-white print:from-white print:to-white">
      {/* Action bar — hidden on print */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 print:hidden">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <Link
            href={`/track/${order.id}`}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#3e1e0c] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Order
          </Link>
          <div className="flex items-center gap-2">
            {!isPaid && (
              <span className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Payment Pending — Pay at Counter
              </span>
            )}
            <button
              onClick={onDownload}
              disabled={downloading || !isPaid}
              title={!isPaid ? "Bill can only be downloaded after payment is collected" : undefined}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-[#eaa94d]/20 hover:text-[#eaa94d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloading ? "Generating…" : downloadLabel}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-[#eaa94d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#d67620] transition-all shadow-sm shadow-[#eaa94d]/20"
            >
              <Printer className="h-3.5 w-3.5" />
              {printLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Bill content */}
      <div className="mx-auto max-w-2xl px-4 py-8 print:py-0 print:px-0 print:max-w-none">
        <motion.div
          ref={billRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl shadow-2xl shadow-black/5 border border-gray-100/50 overflow-hidden print:shadow-none print:border-none print:rounded-none"
        >
          {/* ── Header ─────────────────────────────── */}
          <div className="relative px-6 pt-8 pb-6 sm:px-8 bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] text-white print:bg-black print:from-black print:to-black">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/5 -mr-10 -mt-10 print:hidden" />
            <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white/5 -ml-5 -mb-5 print:hidden" />

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-5 w-5 text-[#e58f2a]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {docLabel}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {bill.billNo}
                  </h1>
                </div>
                <div
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border ${
                    isPaid
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {isPaid ? "PAID" : "UNPAID"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(bill.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  Order: {order.orderNo}
                </span>
                {order.tableNo && (
                  <span className="flex items-center gap-1.5">
                    <Utensils className="h-3 w-3" />
                    Table {order.tableNo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Restaurant & Customer info ──────────── */}
          <div className="px-6 sm:px-8 py-5 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                From
              </p>
              <p className="text-sm font-bold text-[#3e1e0c]">
                {order.restaurant.name}
              </p>
              <p className="text-[12px] text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />{" "}
                {order.restaurant.address}
              </p>
              <p className="text-[12px] text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" /> {order.restaurant.phone}
              </p>
            </div>
            {order.user && (
              <div className="space-y-1.5 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Bill to
                </p>
                <p className="text-sm font-bold text-[#3e1e0c]">
                  {order.user.name || "Guest"}
                </p>
                {order.user.email && (
                  <p className="text-[12px] text-gray-500">
                    {order.user.email}
                  </p>
                )}
                {order.user.phone && (
                  <p className="text-[12px] text-gray-500 flex items-center gap-1 sm:justify-end">
                    <Phone className="h-3 w-3 shrink-0" /> {order.user.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Order status badge ──────────────────── */}
          <div className="px-6 sm:px-8 pt-4 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${statusColor(order.status)}`}
            >
              {order.status === "DELIVERED" && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {order.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-500 border border-gray-100">
              <Clock className="h-3 w-3" />
              {order.type.replace("_", " ")}
            </span>
          </div>

          {/* ── Items table ────────────────────────── */}
          <div className="px-6 sm:px-8 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Item
                  </th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 w-16">
                    Qty
                  </th>
                  <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20">
                    Price
                  </th>
                  <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`${i < order.items.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <td className="py-3">
                      <p className="font-bold text-[#3e1e0c] text-[13px]">
                        {item.name}
                      </p>
                      {item.addOns && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          + {item.addOns}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center text-gray-500 font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-gray-500 font-medium">
                      {formatPrice(item.price, cur)}
                    </td>
                    <td className="py-3 text-right font-bold text-[#3e1e0c]">
                      {formatPrice(item.price * item.quantity, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ─────────────────────────────── */}
          <div className="px-6 sm:px-8 py-5 bg-gray-50/50 border-t border-gray-100 space-y-2.5 print:bg-gray-50">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-[#3e1e0c]">
                {formatPrice(bill.subtotal, cur)}
              </span>
            </div>
            {bill.tax > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium text-[#3e1e0c]">
                  {formatPrice(bill.tax, cur)}
                </span>
              </div>
            )}
            {bill.serviceCharge > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Service Charge</span>
                <span className="font-medium text-[#3e1e0c]">
                  {formatPrice(bill.serviceCharge, cur)}
                </span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#eaa94d] font-medium">Discount</span>
                <span className="font-medium text-[#eaa94d]">
                  -{formatPrice(bill.discount, cur)}
                </span>
              </div>
            )}

            <div className="border-t-2 border-dashed border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
              <span className="text-base font-extrabold text-[#3e1e0c]">
                Grand Total
              </span>
              <span className="text-2xl font-extrabold text-[#3e1e0c]">
                {formatPrice(bill.total, cur)}
              </span>
            </div>
          </div>

          {/* ── Payment info ───────────────────────── */}
          {order.payment && (
            <div className="px-6 sm:px-8 py-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isPaid ? "bg-emerald-50" : "bg-amber-50"
                  }`}
                >
                  <CreditCard
                    className={`h-5 w-5 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[#3e1e0c]">
                    {paymentLabel(order.payment.method)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {isPaid
                      ? `Paid on ${formatDateTime(order.payment.paidAt!)}`
                      : "Payment pending"}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {order.payment.status}
                </span>
              </div>
              {order.payment.transactionId && (
                <p className="mt-2 text-[11px] text-gray-400 pl-[52px]">
                  <span className="font-medium">Txn ID:</span>{" "}
                  {order.payment.transactionId}
                </p>
              )}
            </div>
          )}

          {/* ── Note ───────────────────────────────── */}
          {order.note && (
            <div className="px-6 sm:px-8 py-4 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Order Note
              </p>
              <p className="text-[13px] text-gray-600 italic">"{order.note}"</p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────── */}
          <div className="px-6 sm:px-8 py-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-[12px] font-bold text-[#eaa94d]">
              Thank you for dining with us!
            </p>
            <p className="text-[11px] text-gray-400">
              This is a computer-generated invoice and does not require a
              signature.
            </p>
            <p className="text-[10px] text-gray-300 mt-2 print:hidden">
              Powered by{" "}
              <span className="font-bold text-gray-400">HimaVolt</span>
            </p>
          </div>
        </motion.div>

        {/* ── Action buttons below bill (hidden on print) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden"
        >
          <button
            onClick={onDownload}
            disabled={downloading || !isPaid}
            title={!isPaid ? "Bill can only be downloaded after payment is collected" : undefined}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-600 hover:border-[#eaa94d]/30 hover:text-[#eaa94d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Generating PDF…" : downloadLabel}
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#eaa94d] to-[#e58f2a] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#eaa94d]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            {printLabel}
          </button>
        </motion.div>

        {/* ── Feedback QR (shown after payment) ─── */}
        {isPaid && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-center print:hidden"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-[#3e1e0c]">Share your feedback</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Scan the QR below or tap the link to rate your experience
            </p>
            <div className="flex justify-center mb-3">
              <div className="rounded-xl bg-white p-3 border border-amber-100 shadow-sm inline-block">
                <QRCode
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${order.restaurantId}?order=${order.id}`}
                  size={100}
                  fgColor="#3e1e0c"
                />
              </div>
            </div>
            <Link
              href={`/feedback/${order.restaurantId}?order=${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
            >
              <Star className="h-3.5 w-3.5" /> Leave a Review
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Print styles ───────────────────────────── */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:from-white {
            --tw-gradient-from: white !important;
          }
          .print\\:to-white {
            --tw-gradient-to: white !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:bg-black {
            background: #3e1e0c !important;
          }
          .print\\:from-black {
            --tw-gradient-from: #3e1e0c !important;
          }
          .print\\:to-black {
            --tw-gradient-to: #5a3118 !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:bg-gray-50 {
            background: #f9fafb !important;
          }
        }
      `}</style>
    </div>
  );
}
