"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Printer, ArrowLeft, Receipt, CheckCircle2, CreditCard, Utensils, Calendar, Hash, MapPin, Phone, Clock, Loader2, AlertCircle, Star } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { resolvePrintSettings } from "@/lib/print-settings";
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
      imageUrl?: string | null;
      printCounterWidth?: number | null;
      printShowLogo?: boolean | null;
      printShowFeedbackQR?: boolean | null;
    };
    user: {
      name: string | null;
      email: string;
      phone: string | null;
    } | null;
    payment: BillPayment | null;
  };
}


interface OrderFeedback {
  rating: number | null;
  comment: string | null;
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
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
  if (status === "ACCEPTED")
    return "bg-[#fef9ef] text-[var(--accent-text)] border-[var(--accent)]/30";
  if (status === "REJECTED" || status === "REJECTED")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-[var(--accent-muted)] text-[var(--accent-text)] border-[var(--accent-border)]";
}

/* ── Print & Download ───────────────────────────────────────────── */

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
  const [feedback, setFeedback] = useState<OrderFeedback | null>(null);
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

  // Pull any review left for this order so we can show the venue's reply.
  useEffect(() => {
    if (!bill) return;
    let active = true;
    fetch(`/api/public/feedback/${params.orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setFeedback(d.feedback ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [bill, params.orderId]);

  // Auto-print: when opened with ?autoprint=1 (from a settled payment), fire the
  // print dialog once the bill has rendered, then close the popup afterwards.
  const autoPrinted = useRef(false);
  useEffect(() => {
    if (!bill || autoPrinted.current) return;
    const wantsPrint = new URLSearchParams(window.location.search).has(
      "autoprint",
    );
    if (!wantsPrint) return;
    autoPrinted.current = true;
    const onAfterPrint = () => window.close();
    window.addEventListener("afterprint", onAfterPrint);
    // Give the thermal layout + feedback QR a beat to paint before printing.
    const t = setTimeout(() => window.print(), 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [bill]);

  const onDownload = useCallback(async () => {
    if (!bill) return;
    setDownloading(true);
    try {
      await handleDownload(billRef, bill.billNo);
    } finally {
      setDownloading(false);
    }
  }, [bill]);

  // While the bill is still loading, show a quiet loader — NOT the "Bill not
  // found" state. Rendering the error during the in-flight fetch caused a
  // false "Bill not found" to flash for a few seconds before the bill appeared.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--canvas-sub)] to-[var(--canvas)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--canvas-sub)] to-[var(--canvas)]">
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
  const printSettings = resolvePrintSettings(order.restaurant);
  const isPaid = order.payment?.status === "COMPLETED";
  const isOnlinePayment = order.payment && order.payment.method !== "CASH";
  const docLabel = isOnlinePayment ? "Payment Receipt" : "Invoice";
  const downloadLabel = isOnlinePayment
    ? "Download Receipt PDF"
    : "Download Bill PDF";
  const printLabel = isOnlinePayment ? "Print Receipt" : "Print Bill";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--canvas-sub)] to-[var(--canvas)] print:bg-[var(--canvas)] print:from-white print:to-white">
      {/* Action bar — hidden on print */}
      <div className="sticky top-0 z-30 bg-[var(--canvas)]/80 backdrop-blur-xl border-b border-[var(--border-soft)] print:hidden">
        <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
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
                Payment Pending: Pay at Counter
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
              onClick={() => window.print()}
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
          className="bg-[var(--canvas)] rounded-3xl shadow-2xl shadow-black/5 border border-[var(--border-soft)]/50 overflow-hidden print:hidden"
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
              {order.status === "ACCEPTED" && (
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
              <p className="text-[13px] text-[var(--text-2)] italic">&ldquo;{order.note}&rdquo;</p>
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

        {/* ── Thermal receipt layout — only rendered when printing ── */}
        <div className="thermal-receipt" data-width={printSettings.counterWidth} aria-hidden>
          {printSettings.showLogo && order.restaurant.imageUrl && (
            <div className="tr-center tr-logo-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="tr-logo" src={order.restaurant.imageUrl} alt="" />
            </div>
          )}
          <div className="tr-center tr-brand">{order.restaurant.name}</div>
          {order.restaurant.address && (
            <div className="tr-center tr-muted">{order.restaurant.address}</div>
          )}
          {order.restaurant.phone && (
            <div className="tr-center tr-muted">Tel: {order.restaurant.phone}</div>
          )}

          <div className="tr-divider" />

          <div className="tr-center tr-doc">{docLabel.toUpperCase()}</div>
          <div className="tr-center tr-billno">{bill.billNo}</div>
          <div className="tr-center tr-muted">{formatDateTime(bill.createdAt)}</div>

          <div className="tr-meta">
            <span>Order #{order.orderNo}</span>
            {order.tableNo ? <span>Table {order.tableNo}</span> : <span />}
          </div>
          <div className="tr-meta">
            <span>{order.type.replace("_", " ")}</span>
            <span>{isPaid ? "PAID" : "UNPAID"}</span>
          </div>
          {order.user?.name && (
            <div className="tr-meta">
              <span>Guest</span>
              <span>{order.user.name}</span>
            </div>
          )}

          <div className="tr-divider" />

          {order.items.map((item) => (
            <div className="tr-item" key={item.id}>
              <div className="tr-item-name">{item.name}</div>
              {item.addOns && <div className="tr-item-add">+ {item.addOns}</div>}
              <div className="tr-item-line">
                <span>
                  {formatPrice(item.price, cur)} &times; {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity, cur)}</span>
              </div>
            </div>
          ))}

          <div className="tr-divider" />

          <div className="tr-row">
            <span>Subtotal</span>
            <span>{formatPrice(bill.subtotal, cur)}</span>
          </div>
          {bill.tax > 0 && (
            <div className="tr-row">
              <span>Tax</span>
              <span>{formatPrice(bill.tax, cur)}</span>
            </div>
          )}
          {bill.serviceCharge > 0 && (
            <div className="tr-row">
              <span>Service Charge</span>
              <span>{formatPrice(bill.serviceCharge, cur)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="tr-row">
              <span>Delivery Fee</span>
              <span>{formatPrice(order.deliveryFee, cur)}</span>
            </div>
          )}
          {bill.discount > 0 && (
            <div className="tr-row">
              <span>Discount</span>
              <span>-{formatPrice(bill.discount, cur)}</span>
            </div>
          )}

          <div className="tr-divider tr-divider-bold" />
          <div className="tr-total">
            <span>GRAND TOTAL</span>
            <span>{formatPrice(bill.total, cur)}</span>
          </div>
          <div className="tr-divider tr-divider-bold" />

          {order.payment && (
            <div className="tr-center tr-pay">
              Paid via {paymentLabel(order.payment.method)} &middot;{" "}
              {order.payment.status}
            </div>
          )}
          {order.payment?.transactionId && (
            <div className="tr-center tr-muted tr-txn">
              Txn: {order.payment.transactionId}
            </div>
          )}
          {order.note && <div className="tr-center tr-note">&ldquo;{order.note}&rdquo;</div>}

          {printSettings.showFeedbackQR && (
            <div className="tr-center tr-qr-wrap">
              <div className="tr-qr">
                <QRCode
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${order.restaurantId}?order=${order.id}`}
                  size={132}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              <div className="tr-qr-cap">Scan to rate your experience</div>
            </div>
          )}

          <div className="tr-dots" />
          <div className="tr-center tr-thanks">
            &#9829; Thank you for dining with us! &#9829;
          </div>
          <div className="tr-center tr-muted tr-fine">
            Computer-generated {docLabel.toLowerCase()} &middot; No signature
            required
          </div>
          <div className="tr-center tr-muted tr-power">Powered by HimaVolt</div>
        </div>

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
            onClick={() => window.print()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[#e58f2a] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            {printLabel}
          </button>
        </motion.div>

        {/* ── Feedback (shown after payment) ─── */}
        {isPaid && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-5 print:hidden"
          >
            {feedback ? (
              /* Already reviewed — show their rating + the venue's reply. */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-1)]">
                    Your feedback
                  </span>
                  {feedback.rating != null && (
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= feedback.rating!
                              ? "text-[var(--accent)] fill-current"
                              : "text-[var(--text-3)] fill-current"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </div>
                {feedback.comment && (
                  <p className="text-[13px] italic text-[var(--text-2)]">
                    &ldquo;{feedback.comment}&rdquo;
                  </p>
                )}
                {feedback.reply ? (
                  <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--canvas)] p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="h-3 w-3 text-[var(--accent)]" />
                      <span className="text-[11px] font-bold text-[var(--accent-text)]">
                        {feedback.repliedBy || order.restaurant.name} replied
                      </span>
                      {feedback.repliedAt && (
                        <span className="text-[10px] text-[var(--text-3)]">
                          · {formatDate(feedback.repliedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--text-1)]">{feedback.reply}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-3)]">
                    Thanks for the feedback. The team will reply soon.
                  </p>
                )}
              </div>
            ) : (
              /* Not yet reviewed — invite them to. */
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-sm font-bold text-[var(--text-1)]">
                    Share your feedback
                  </span>
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
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Thermal receipt print styles ───────────────────────────── */}
      <style jsx global>{`
        /* The thermal receipt is print-only — never shown on screen */
        .thermal-receipt {
          display: none;
        }

        @media print {
          @page {
            margin: 0;
          }
          html,
          body {
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }

          /* Receipt root — sized for an 80mm thermal roll, crisp black on white */
          .thermal-receipt {
            display: block !important;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 5mm 5mm 7mm;
            box-sizing: border-box;
            color: #000;
            background: #fff;
            font-family: "Cascadia Mono", "DejaVu Sans Mono", Consolas,
              "Courier New", monospace;
            font-size: 12px;
            line-height: 1.45;
            -webkit-font-smoothing: none;
          }
          .thermal-receipt * {
            color: #000 !important;
          }

          .tr-center {
            text-align: center;
          }
          .tr-brand {
            font-size: 19px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .tr-muted {
            font-size: 11px;
          }
          .tr-doc {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 3px;
            margin-top: 3px;
          }
          .tr-billno {
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 1px;
          }

          .tr-divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .tr-divider-bold {
            border-top: 2px solid #000;
            margin: 5px 0;
          }
          .tr-dots {
            border-top: 1px dotted #000;
            margin: 7px 0;
          }

          .tr-meta {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 11px;
            margin-top: 1px;
          }

          .tr-item {
            margin-bottom: 5px;
          }
          .tr-item-name {
            font-weight: 700;
            font-size: 12.5px;
          }
          .tr-item-add {
            font-size: 10.5px;
            padding-left: 8px;
          }
          .tr-item-line {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 11.5px;
          }

          .tr-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            margin: 1px 0;
          }
          .tr-total {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
            font-size: 16px;
            font-weight: 800;
            margin: 3px 0;
          }
          .tr-pay {
            font-weight: 700;
            font-size: 12px;
            margin-top: 5px;
          }
          .tr-txn {
            word-break: break-all;
            margin-top: 2px;
          }
          .tr-note {
            font-style: italic;
            font-size: 11px;
            margin-top: 5px;
          }
          .tr-thanks {
            font-size: 13px;
            font-weight: 700;
            margin: 4px 0 2px;
          }
          .tr-fine {
            font-size: 9.5px;
            margin-top: 3px;
          }
          .tr-power {
            font-size: 9.5px;
            letter-spacing: 1px;
            margin-top: 2px;
          }

          /* Logo */
          .tr-logo-wrap {
            margin-bottom: 4px;
          }
          .tr-logo {
            max-height: 18mm;
            max-width: 60%;
            object-fit: contain;
            filter: grayscale(1) contrast(1.3);
          }

          /* Feedback QR — crisp black squares print perfectly on thermal */
          .tr-qr-wrap {
            margin: 8px 0 2px;
          }
          .tr-qr {
            display: inline-block;
            padding: 2mm;
            background: #fff;
          }
          .tr-qr svg {
            display: block;
            width: 28mm;
            height: 28mm;
          }
          .tr-qr-cap {
            font-size: 10px;
            margin-top: 3px;
          }

          /* ── 58mm roll overrides — tighter type so nothing clips ── */
          .thermal-receipt[data-width="58"] {
            width: 58mm;
            max-width: 58mm;
            padding: 4mm 3.5mm 6mm;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .thermal-receipt[data-width="58"] .tr-brand {
            font-size: 15px;
          }
          .thermal-receipt[data-width="58"] .tr-billno {
            font-size: 13px;
          }
          .thermal-receipt[data-width="58"] .tr-total {
            font-size: 14px;
          }
          .thermal-receipt[data-width="58"] .tr-item-name {
            font-size: 11px;
          }
          .thermal-receipt[data-width="58"] .tr-item-line,
          .thermal-receipt[data-width="58"] .tr-row {
            font-size: 10.5px;
          }
          .thermal-receipt[data-width="58"] .tr-qr svg {
            width: 24mm;
            height: 24mm;
          }
        }
      `}</style>
    </div>
  );
}
