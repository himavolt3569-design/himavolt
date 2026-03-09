"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  ArrowLeft,
  Receipt,
  CreditCard,
  Copy,
  Check,
  MapPin,
  Phone,
  Timer,
  Loader2,
  BedDouble,
  QrCode,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import ChatWidget from "@/components/chat/ChatWidget";
import gsap from "gsap";

interface TrackingOrder {
  id: string;
  orderNo: string;
  restaurantId: string;
  tableNo: number | null;
  roomNo: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  type: string;
  estimatedTime: number | null;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  payment: {
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  bill: {
    billNo: string;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    total: number;
  } | null;
  restaurant: {
    name: string;
    slug: string;
    address: string;
    phone: string;
    imageUrl: string | null;
  };
}

const STEPS = [
  { key: "PENDING", label: "Order Placed", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500" },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "text-amber-500", bg: "bg-amber-500" },
  { key: "READY", label: "Ready", icon: PackageCheck, color: "text-green-500", bg: "bg-green-500" },
  { key: "DELIVERED", label: "Delivered", icon: Truck, color: "text-[#0A4D3C]", bg: "bg-[#0A4D3C]" },
];

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function CountdownTimer({
  estimatedTime,
  startedAt,
}: {
  estimatedTime: number;
  startedAt: string;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    function calc() {
      const start = new Date(startedAt).getTime();
      const end = start + estimatedTime * 60 * 1000;
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [estimatedTime, startedAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = Math.max(
    0,
    Math.min(
      1,
      1 -
        remaining /
          (estimatedTime * 60)
    )
  );

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="6"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#FF9933"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={264}
            animate={{ strokeDashoffset: 264 * (1 - progress) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Timer className="h-4 w-4 text-[#FF9933] mb-0.5" />
          <span className="text-2xl font-black text-[#1F2A2A] tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <span className="text-[10px] font-medium text-gray-400">remaining</span>
        </div>
      </div>
      {remaining === 0 && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs font-bold text-[#FF9933]"
        >
          Should be ready any moment!
        </motion.p>
      )}
    </div>
  );
}

function PaymentBadge({ method, status }: { method: string; status: string }) {
  const methods: Record<string, { label: string; color: string }> = {
    ESEWA: { label: "eSewa", color: "bg-green-100 text-green-700" },
    KHALTI: { label: "Khalti", color: "bg-purple-100 text-purple-700" },
    BANK: { label: "Bank Transfer", color: "bg-blue-100 text-blue-700" },
    CASH: { label: "Cash", color: "bg-gray-100 text-gray-700" },
  };
  const m = methods[method] || { label: method, color: "bg-gray-100 text-gray-700" };
  const isPaid = status === "COMPLETED";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${m.color}`}>
        <CreditCard className="h-3 w-3" />
        {m.label}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          isPaid
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {isPaid ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Paid
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" /> Pending
          </>
        )}
      </span>
    </div>
  );
}

function BillSection({ bill, order }: { bill: TrackingOrder["bill"]; order: TrackingOrder }) {
  if (!bill) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <Receipt className="h-4 w-4 text-[#FF9933]" />
        <h3 className="text-sm font-bold text-[#1F2A2A]">Invoice</h3>
        <span className="ml-auto text-[11px] font-mono text-gray-400">
          {bill.billNo}
        </span>
      </div>
      <div className="px-5 py-4 space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-600">
              <span className="font-bold text-[#FF9933]">{item.quantity}x</span>{" "}
              {item.name}
            </span>
            <span className="font-semibold text-[#1F2A2A]">
              Rs. {item.price * item.quantity}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-200 pt-3 mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span>
            <span>Rs. {bill.subtotal}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tax (13%)</span>
            <span>Rs. {bill.tax}</span>
          </div>
          {bill.serviceCharge > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Service Charge (10%)</span>
              <span>Rs. {bill.serviceCharge}</span>
            </div>
          )}
          {bill.discount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Discount</span>
              <span>-Rs. {bill.discount}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-200">
            <span className="text-[#1F2A2A]">Total</span>
            <span className="text-[#FF9933]">Rs. {bill.total}</span>
          </div>
        </div>
        <Link
          href={`/bill/${order.id}`}
          className="flex items-center justify-center gap-2 mt-4 rounded-xl bg-[#E23744] py-2.5 text-xs font-bold text-white hover:bg-[#c92e3c] transition-all shadow-sm"
        >
          <Receipt className="h-3.5 w-3.5" />
          View Full Bill · Download
        </Link>
      </div>
    </motion.div>
  );
}

export default function TrackOrderPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const orderId = params.orderId;
  const paymentStatus = searchParams.get("payment");

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showQRs, setShowQRs] = useState(false);
  const [paymentQRs, setPaymentQRs] = useState<{ id: string; label: string; imageUrl: string }[]>([]);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch<TrackingOrder>(
        `/api/track?orderId=${orderId}`
      );
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // SSE-based real-time updates with polling fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource(`/api/track/stream?orderId=${orderId}`);

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "order" && data.order) {
              setOrder(data.order);
              setError(null);
              setLoading(false);
            } else if (data.type === "error") {
              setError(data.message);
              setLoading(false);
            }
          } catch {
            /* ignore parse errors */
          }
        };

        es.onerror = () => {
          // SSE connection failed — fall back to polling
          es?.close();
          es = null;
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchOrder, 5000);
          }
        };
      } catch {
        // EventSource not supported — use polling
        fetchOrder();
        fallbackInterval = setInterval(fetchOrder, 5000);
      }
    };

    // Initial fetch + SSE connection
    fetchOrder();
    connectSSE();

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [orderId, fetchOrder]);

  // Fetch payment QRs once order is loaded
  useEffect(() => {
    if (!order?.restaurant.slug) return;
    if (order.payment?.status === "COMPLETED") return;
    apiFetch<{ id: string; label: string; imageUrl: string }[]>(
      `/api/public/restaurants/${order.restaurant.slug}/payment-qrs`
    )
      .then(setPaymentQRs)
      .catch(() => setPaymentQRs([]));
  }, [order?.restaurant.slug, order?.payment?.status]);

  useEffect(() => {
    if (
      order?.status === "DELIVERED" ||
      order?.status === "CANCELLED" ||
      order?.status === "REJECTED"
    ) {
      return;
    }
  }, [order?.status]);

  useEffect(() => {
    if (
      order?.status === "PREPARING" &&
      clockRef.current &&
      handRef.current
    ) {
      const ctx = gsap.context(() => {
        gsap.to(handRef.current!, {
          rotation: 360,
          duration: 1.5,
          repeat: -1,
          ease: "linear",
          transformOrigin: "bottom center",
        });
      });
      return () => ctx.revert();
    }
  }, [order?.status]);

  const copyOrderId = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF9933]" />
          <p className="text-sm font-medium text-gray-500">
            Loading your order...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[#1F2A2A] mb-1">
            Order Not Found
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || "We couldn't find this order."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white hover:bg-[#083a2d] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled =
    order.status === "CANCELLED" || order.status === "REJECTED";
  const isComplete = order.status === "DELIVERED";
  const isActive = !isCancelled && !isComplete;
  const showTimer =
    isActive &&
    order.estimatedTime &&
    (order.preparingAt || order.acceptedAt);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <Link
              href={order ? `/menu/${order.restaurant.slug}` : "/"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-[#1F2A2A]">
                Track Order
              </h1>
              <p className="text-[11px] text-gray-400">Live updates</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-[11px] font-bold text-green-600">
                  Live
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Payment status toast */}
        <AnimatePresence>
          {paymentStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${
                paymentStatus === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {paymentStatus === "success"
                ? "Payment successful!"
                : "Payment failed. Please try again or pay at counter."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order ID card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                Order ID
              </p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-xl font-black text-[#1F2A2A]">
                  {order.orderNo}
                </h2>
                <button
                  onClick={copyOrderId}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {(order.tableNo || order.roomNo || order.type) && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {order.tableNo && (
                    <span className="text-xs text-gray-500">
                      Table {order.tableNo}
                    </span>
                  )}
                  {order.roomNo && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                      <BedDouble className="h-3 w-3" />
                      Room {order.roomNo}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {order.type === "DINE_IN"
                      ? "Dine In"
                      : order.type === "TAKEAWAY"
                        ? "Takeaway"
                        : "Delivery"}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-lg font-extrabold text-[#FF9933] mt-0.5">
                Rs. {order.total}
              </p>
            </div>
          </div>

          {/* Restaurant info */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="h-10 w-10 rounded-xl bg-[#0A4D3C]/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-[#0A4D3C]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1F2A2A] truncate">
                {order.restaurant.name}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {order.restaurant.address}
              </p>
            </div>
            {order.restaurant.phone && (
              <a
                href={`tel:${order.restaurant.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A4D3C]/10 text-[#0A4D3C] hover:bg-[#0A4D3C]/20 transition-colors"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Payment badge */}
          {order.payment && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <PaymentBadge
                method={order.payment.method}
                status={order.payment.status}
              />
            </div>
          )}
        </motion.div>

        {/* Payment QR section — shown when payment is still pending */}
        {paymentQRs.length > 0 && order.payment && order.payment.status !== "COMPLETED" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden shadow-sm"
          >
            <button
              onClick={() => setShowQRs(!showQRs)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">
                  Scan to Pay &middot; Rs. {order.total}
                </span>
              </div>
              <motion.div animate={{ rotate: showQRs ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-amber-600" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showQRs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-3">
                    <p className="text-[11px] text-amber-700">
                      Scan one of the QR codes below to complete your payment.
                    </p>
                    {paymentQRs.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => setSelectedQR(selectedQR === qr.id ? null : qr.id)}
                        className={`w-full rounded-xl border-2 p-3 text-left transition-all bg-white ${
                          selectedQR === qr.id ? "border-amber-400" : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                            <QrCode className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="text-sm font-bold text-[#1F2A2A]">{qr.label}</span>
                          <motion.div
                            animate={{ rotate: selectedQR === qr.id ? 180 : 0 }}
                            className="ml-auto"
                          >
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </motion.div>
                        </div>
                        <AnimatePresence>
                          {selectedQR === qr.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <img
                                src={qr.imageUrl}
                                alt={qr.label}
                                className="w-full max-h-72 object-contain rounded-xl bg-white border border-gray-100 p-2"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Countdown timer */}
        {showTimer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white border border-gray-200 p-6 flex justify-center shadow-sm"
          >
            <CountdownTimer
              estimatedTime={order.estimatedTime!}
              startedAt={order.preparingAt || order.acceptedAt!}
            />
          </motion.div>
        )}

        {/* Status section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm"
        >
          {isCancelled ? (
            <div className="flex flex-col items-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-3"
              >
                <XCircle className="h-8 w-8 text-red-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-[#1F2A2A]">
                {order.status === "REJECTED"
                  ? "Order Rejected"
                  : "Order Cancelled"}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {order.status === "REJECTED"
                  ? "The restaurant was unable to fulfill your order"
                  : "This order has been cancelled"}
              </p>
            </div>
          ) : isComplete ? (
            <div className="flex flex-col items-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0A4D3C] mb-3"
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-bold text-[#1F2A2A]">
                Order Delivered!
              </h3>
              <p className="text-sm text-gray-400 mt-1">Enjoy your meal!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-6">
              {order.status === "PREPARING" ? (
                <div
                  ref={clockRef}
                  className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#FF9933] bg-white shadow-lg mb-3"
                >
                  <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF9933] z-10" />
                  <div
                    ref={handRef}
                    className="absolute bottom-1/2 left-1/2 h-5 w-[2px] -translate-x-1/2 rounded-full bg-[#FF9933] origin-bottom"
                  />
                </div>
              ) : (
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${STEPS[currentStep].bg} mb-3`}
                >
                  {(() => {
                    const Icon = STEPS[currentStep].icon;
                    return <Icon className="h-8 w-8 text-white" />;
                  })()}
                </div>
              )}
              <h3 className="text-lg font-bold text-[#1F2A2A]">
                {STEPS[currentStep].label}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {order.status === "PENDING" &&
                  "Your order has been sent to the kitchen"}
                {order.status === "ACCEPTED" &&
                  "Restaurant confirmed your order"}
                {order.status === "PREPARING" &&
                  "Chef is working on your food"}
                {order.status === "READY" && "Your food is ready for pickup!"}
              </p>
            </div>
          )}

          {/* Progress steps */}
          {!isCancelled && (
            <div className="space-y-0">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = i <= currentStep;
                const isCurrent = i === currentStep;

                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isCurrent ? 1.1 : 1,
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isDone ? step.bg : "bg-gray-100"
                        } transition-colors`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isDone ? "text-white" : "text-gray-400"
                          }`}
                        />
                      </motion.div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ${
                            i < currentStep ? step.bg : "bg-gray-200"
                          } transition-colors`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-sm font-bold ${
                          isDone ? "text-[#1F2A2A]" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isDone && i === 0 && order.createdAt && (
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 1 && order.acceptedAt && (
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.acceptedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 2 && order.preparingAt && (
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.preparingAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 3 && order.readyAt && (
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.readyAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 4 && order.deliveredAt && (
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.deliveredAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isCurrent && isActive && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="mt-0.5 h-1 w-16 rounded-full bg-[#FF9933]/30"
                        >
                          <motion.div
                            animate={{ width: ["0%", "100%", "0%"] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="h-full rounded-full bg-[#FF9933]"
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Order items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Order Items
          </h3>
          <div className="space-y-2.5">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF9933]/10 text-[11px] font-bold text-[#FF9933]">
                    {item.quantity}
                  </span>
                  <span className="text-sm font-medium text-[#1F2A2A]">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-500">
                  Rs. {item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1F2A2A]">Total</span>
            <span className="text-base font-extrabold text-[#FF9933]">
              Rs. {order.total}
            </span>
          </div>
        </motion.div>

        {/* Bill toggle */}
        <button
          onClick={() => setShowBill(!showBill)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3.5 px-5 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#FF9933]" />
            <span className="text-sm font-bold text-[#1F2A2A]">
              View Invoice
            </span>
          </div>
          <motion.span
            animate={{ rotate: showBill ? 180 : 0 }}
            className="text-gray-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.span>
        </button>

        <AnimatePresence>
          {showBill && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <BillSection bill={order.bill} order={order} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back button */}
        <Link
          href={`/menu/${order.restaurant.slug}`}
          className="block w-full rounded-xl bg-[#0A4D3C] py-4 text-center text-sm font-bold text-white hover:bg-[#083a2d] transition-colors shadow-lg"
        >
          Back to Menu
        </Link>

        <div className="pb-8" />
      </div>

      {/* Live chat with kitchen/billing */}
      {isActive && (
        <ChatWidget
          orderId={order.id}
          restaurantId={order.restaurantId}
          senderRole="CUSTOMER"
          senderName="Customer"
        />
      )}
    </div>
  );
}
