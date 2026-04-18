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
    deliveryFee: number;
    deliveryAddress: string | null;
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
    DIRECT: "Fast Pay",
  };
  return map[method] || method;
}

function statusColor(status: string) {
  if (status === "DELIVERED")
    return "bg-[#fef9ef] text-[var(--accent-text)] border-[var(--accent)]/30";
  if (status === "CANCELLED" || status === "REJECTED")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-[var(--accent-muted)] text-[var(--accent-text)] border-[var(--accent-border)]";
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

  if (error || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-7 w-7 text-[var(--accent)]" />
          </div>
          <p className="text-lg font-bold text-[var(--text-1)]">Bill not found</p>
          <p className="text-sm text-[var(--text-3)]">
            This order may not have a bill yet
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20"
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 print:bg-[var(--canvas)] print:from-white print:to-white">
      {/* Action bar — hidden on print */}
      <div className="sticky top-0 z-30 bg-[var(--canvas)]/80 backdrop-blur-xl border-b border-[var(--border-soft)] print:hidden">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <Link
            href={`/track/${order.id}`}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Order
          </Link>
          <div className="flex items-center gap-2">
            {!isPaid && (
              <span className="flex items-center gap-1.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-2.5 text-xs font-bold text-[var(--accent-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] inline-block" />
                Payment Pending — Pay at Counter
              </span>
            )}
            <button
              onClick={onDownload}
              disabled={downloading || !isPaid}
              title={!isPaid ? "Bill can only be downloaded after payment is collected" : undefined}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:border-[var(--accent)]/20 hover:text-[var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm shadow-[var(--accent)]/20"
            >
              <Printer className="h-3.5 w-3.5" />
              {printLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 print:py-0 print:px-0 print:max-w-none">
        <motion.div
          ref={billRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[var(--canvas)] rounded-3xl shadow-2xl shadow-black/5 border border-[var(--border-soft)]/50 overflow-hidden print:shadow-none print:border-none print:rounded-none"
        >
          {/* ── Header ─────────────────────────────── */}
          <div className="relative px-6 pt-8 pb-6 sm:px-8 bg-gradient-to-br from-[#3e1e0c] to-[#5a3118] text-white print:bg-black print:from-black print:to-black">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--canvas)]/80 -mr-10 -mt-10 print:hidden" />
            <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-[var(--canvas)]/80 -ml-5 -mb-5 print:hidden" />

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-5 w-5 text-[#e58f2a]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)]">
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
                      ? "bg-[var(--accent)]/10 text-[var(--accent-hover)] border-[var(--accent)]/20"
                      : "bg-[var(--accent-border)] text-[var(--accent)] border-[var(--accent)]/20"
                  }`}
                >
                  {isPaid ? "PAID" : "UNPAID"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[var(--text-3)]">
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
          <div className="px-6 sm:px-8 py-5 border-b border-[var(--border-soft)] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                From
              </p>
              <p className="text-sm font-bold text-[var(--text-1)]">
                {order.restaurant.name}
              </p>
              <p className="text-[12px] text-[var(--text-2)] flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />{" "}
                {order.restaurant.address}
              </p>
              <p className="text-[12px] text-[var(--text-2)] flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" /> {order.restaurant.phone}
              </p>
            </div>
            {order.user && (
              <div className="space-y-1.5 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                  Bill to
                </p>
                <p className="text-sm font-bold text-[var(--text-1)]">
                  {order.user.name || "Guest"}
                </p>
                {order.user.email && (
                  <p className="text-[12px] text-[var(--text-2)]">
                    {order.user.email}
                  </p>
                )}
                {order.user.phone && (
                  <p className="text-[12px] text-[var(--text-2)] flex items-center gap-1 sm:justify-end">
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
            <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--canvas-sub)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-2)] border border-[var(--border-soft)]">
              <Clock className="h-3 w-3" />
              {order.type.replace("_", " ")}
            </span>
          </div>

          {/* ── Items table ────────────────────────── */}
          <div className="px-6 sm:px-8 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--border-soft)]">
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
                    Item
                  </th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] w-16">
                    Qty
                  </th>
                  <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] w-20">
                    Price
                  </th>
                  <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`${i < order.items.length - 1 ? "border-b border-[var(--border-soft)]" : ""}`}
                  >
                    <td className="py-3">
                      <p className="font-bold text-[var(--text-1)] text-[13px]">
                        {item.name}
                      </p>
                      {item.addOns && (
                        <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                          + {item.addOns}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-center text-[var(--text-2)] font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-[var(--text-2)] font-medium">
                      {formatPrice(item.price, cur)}
                    </td>
                    <td className="py-3 text-right font-bold text-[var(--text-1)]">
                      {formatPrice(item.price * item.quantity, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ─────────────────────────────── */}
          <div className="px-6 sm:px-8 py-5 bg-[var(--canvas-sub)] border-t border-[var(--border-soft)] space-y-2.5 print:bg-[var(--canvas-sub)]">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Subtotal</span>
              <span className="font-medium text-[var(--text-1)]">
                {formatPrice(bill.subtotal, cur)}
              </span>
            </div>
            {bill.tax > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-2)]">Tax</span>
                <span className="font-medium text-[var(--text-1)]">
                  {formatPrice(bill.tax, cur)}
                </span>
              </div>
            )}
            {bill.serviceCharge > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-2)]">Service Charge</span>
                <span className="font-medium text-[var(--text-1)]">
                  {formatPrice(bill.serviceCharge, cur)}
                </span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-2)]">Delivery Fee</span>
                <span className="font-medium text-[var(--text-1)]">
                  {formatPrice(order.deliveryFee, cur)}
                </span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--accent)] font-medium">Discount</span>
                <span className="font-medium text-[var(--accent)]">
                  -{formatPrice(bill.discount, cur)}
                </span>
              </div>
            )}

            <div className="border-t-2 border-dashed border-[var(--border)] mt-3 pt-3 flex justify-between items-baseline">
              <span className="text-base font-extrabold text-[var(--text-1)]">
                Grand Total
              </span>
              <span className="text-2xl font-extrabold text-[var(--text-1)]">
                {formatPrice(bill.total, cur)}
              </span>
            </div>
          </div>

          {/* ── Payment info ───────────────────────── */}
          {order.payment && (
            <div className="px-6 sm:px-8 py-4 border-t border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isPaid ? "bg-[#fef9ef]" : "bg-[var(--accent-muted)]"
                  }`}
                >
                  <CreditCard
                    className={`h-5 w-5 ${isPaid ? "text-[var(--accent-text)]" : "text-[var(--accent-text)]"}`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[var(--text-1)]">
                    {paymentLabel(order.payment.method)}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    {isPaid
                      ? `Paid on ${formatDateTime(order.payment.paidAt!)}`
                      : "Payment pending"}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    isPaid
                      ? "bg-[#fef9ef] text-[var(--accent-text)]"
                      : "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  }`}
                >
                  {order.payment.status}
                </span>
              </div>
              {order.payment.transactionId && (
                <p className="mt-2 text-[11px] text-[var(--text-3)] pl-[52px]">
                  <span className="font-medium">Txn ID:</span>{" "}
                  {order.payment.transactionId}
                </p>
              )}
            </div>
          )}

          {/* ── Note ───────────────────────────────── */}
          {order.note && (
            <div className="px-6 sm:px-8 py-4 border-t border-[var(--border-soft)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">
                Order Note
              </p>
              <p className="text-[13px] text-[var(--text-2)] italic">"{order.note}"</p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────── */}
          <div className="px-6 sm:px-8 py-6 border-t border-[var(--border-soft)] text-center space-y-2">
            <p className="text-[12px] font-bold text-[var(--accent)]">
              Thank you for dining with us!
            </p>
            <p className="text-[11px] text-[var(--text-3)]">
              This is a computer-generated invoice and does not require a
              signature.
            </p>
            <p className="text-[10px] text-[var(--text-3)] mt-2 print:hidden">
              Powered by{" "}
              <span className="font-bold text-[var(--text-3)]">HimaVolt</span>
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--border)] px-6 py-3.5 text-sm font-bold text-[var(--text-2)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[#e58f2a] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
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
            className="mt-6 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-5 text-center print:hidden"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--text-1)]">Share your feedback</span>
            </div>
            <p className="text-xs text-[var(--text-2)] mb-4">
              Scan the QR below or tap the link to rate your experience
            </p>
            <div className="flex justify-center mb-3">
              <div className="rounded-xl bg-[var(--canvas)] p-3 border border-[var(--accent-border)] shadow-sm inline-block">
                <QRCode
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${order.restaurantId}?order=${order.id}`}
                  size={100}
                  fgColor="#3e1e0c"
                />
              </div>
            </div>
            <Link
              href={`/feedback/${order.restaurantId}?order=${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
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
          .print\\:bg-[var(--canvas)] {
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
          .print\\:bg-[var(--canvas-sub)] {
            background: #f9fafb !important;
          }
        }
      `}</style>
    </div>
  );
}
