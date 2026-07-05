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
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { orderTopic } from "@/lib/realtime-topics";
import { formatPrice } from "@/lib/currency";
import ChatWidget from "@/components/chat/ChatWidget";
import TrackingCrossSell from "@/components/tracking/TrackingCrossSell";
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
    transactionId?: string | null;
    proofUrl?: string | null;
  } | null;
  bill: {
    billNo: string;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    total: number;
  } | null;
  prepaidToken: {
    token: string;
    status: string;
    amount: number;
  } | null;
  restaurant: {
    name: string;
    slug: string;
    address: string;
    phone: string;
    imageUrl: string | null;
    currency?: string;
  };
}

const STEPS = [
  {
    key: "PENDING",
    label: "Order Placed",
    icon: CheckCircle2,
    color: "text-blue-500",
    bg: "bg-blue-500",
  },
  {
    key: "ACCEPTED",
    label: "Accepted",
    icon: CheckCircle2,
    color: "text-[var(--accent-hover)]",
    bg: "bg-[var(--accent)]",
  },
  {
    key: "ACCEPTED",
    label: "Preparing",
    icon: ChefHat,
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]",
  },
  {
    key: "ACCEPTED",
    label: "Ready",
    icon: PackageCheck,
    color: "text-[var(--accent-hover)]",
    bg: "bg-[var(--accent)]",
  },
  {
    key: "ACCEPTED",
    label: "Delivered",
    icon: Truck,
    color: "text-[var(--text-1)]",
    bg: "bg-[var(--text-1)]",
  },
];

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}



function PaymentBadge({ method, status }: { method: string; status: string }) {
  const methods: Record<string, { label: string; color: string }> = {
    ESEWA: { label: "eSewa", color: "bg-[var(--accent-muted)] text-[var(--accent-text)]" },
    KHALTI: { label: "Khalti", color: "bg-purple-100 text-purple-700" },
    BANK: { label: "Bank Transfer", color: "bg-blue-100 text-blue-700" },
    CASH: { label: "Cash", color: "bg-[var(--surface)] text-[var(--text-2)]" },
    COUNTER: { label: "Counter Pay", color: "bg-[var(--accent-muted)] text-[var(--accent-text)]" },
    DIRECT: { label: "Fast Pay", color: "bg-teal-100 text-teal-700" },
  };
  const m = methods[method] || {
    label: method,
    color: "bg-[var(--surface)] text-[var(--text-2)]",
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    COMPLETED: { label: "Paid", color: "bg-[var(--accent-muted)] text-[var(--accent-text)]", icon: CheckCircle2 },
    PENDING: { label: "Pending", color: "bg-[var(--accent-muted)] text-[var(--accent-text)]", icon: Clock },
    AWAITING_VERIFICATION: { label: "Verifying", color: "bg-blue-100 text-blue-700", icon: Clock },
    FAILED: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
    EXPIRED: { label: "Expired", color: "bg-red-100 text-red-600", icon: XCircle },
    REFUNDED: { label: "Refunded", color: "bg-[var(--surface)] text-[var(--text-2)]", icon: CheckCircle2 },
  };
  const s = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = s.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${m.color}`}
      >
        <CreditCard className="h-3 w-3" />
        {m.label}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.color}`}
      >
        <StatusIcon className="h-3 w-3" /> {s.label}
      </span>
    </div>
  );
}

function BillSection({
  bill,
  order,
  currency,
}: {
  bill: TrackingOrder["bill"];
  order: TrackingOrder;
  currency: string;
}) {
  if (!bill) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-soft)] bg-[var(--canvas-sub)]">
        <Receipt className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--text-1)]">Invoice</h3>
        <span className="ml-auto text-[11px] font-mono text-[var(--text-3)]">
          {bill.billNo}
        </span>
      </div>
      <div className="px-5 py-4 space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-[var(--text-2)]">
              <span className="font-bold text-[var(--accent)]">{item.quantity}x</span>{" "}
              {item.name}
            </span>
            <span className="font-semibold text-[var(--text-1)]">
              {formatPrice(item.price * item.quantity, currency)}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-[var(--border)] pt-3 mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-2)]">
            <span>Subtotal</span>
            <span>{formatPrice(bill.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-[var(--text-2)]">
            <span>Tax</span>
            <span>{formatPrice(bill.tax, currency)}</span>
          </div>
          {bill.serviceCharge > 0 && (
            <div className="flex justify-between text-xs text-[var(--text-2)]">
              <span>Service Charge</span>
              <span>{formatPrice(bill.serviceCharge, currency)}</span>
            </div>
          )}
          {bill.discount > 0 && (
            <div className="flex justify-between text-xs text-[var(--accent-text)]">
              <span>Discount</span>
              <span>-{formatPrice(bill.discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--text-1)]">Total</span>
            <span className="text-[var(--accent)]">{formatPrice(bill.total, currency)}</span>
          </div>
        </div>
        <Link
          href={`/bill/${order.id}`}
          className="flex items-center justify-center gap-2 mt-4 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm"
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
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentQRs, setPaymentQRs] = useState<
    { id: string; label: string; imageUrl: string }[]
  >([]);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch<TrackingOrder>(
        `/api/track?orderId=${orderId}`,
        { cacheTtl: 0 },
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

  // Instant WebSocket push (Supabase Realtime): the moment staff change status
  // or a payment is confirmed, re-pull the order. SSE above remains the fallback.
  useRealtimeSignal(orderId ? orderTopic(orderId) : null, fetchOrder);

  // Fetch payment QRs once order is loaded
  useEffect(() => {
    if (!order?.restaurant.slug) return;
    if (order.payment?.status === "COMPLETED") return;
    apiFetch<{ id: string; label: string; imageUrl: string }[]>(
      `/api/public/restaurants/${order.restaurant.slug}/payment-qrs`,
    )
      .then(setPaymentQRs)
      .catch(() => setPaymentQRs([]));
  }, [order?.restaurant.slug, order?.payment?.status]);

  useEffect(() => {
    if (
      order?.status === "ACCEPTED" ||
      order?.status === "REJECTED" ||
      order?.status === "REJECTED"
    ) {
      return;
    }
  }, [order?.status]);

  useEffect(() => {
    if (order?.status === "ACCEPTED" && clockRef.current && handRef.current) {
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

  const cancelOrder = async () => {
    if (!order || cancelling) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
      setOrder((prev) => prev ? { ...prev, status: "REJECTED" } : prev);
      setCancelConfirm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const copyOrderId = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyToken = async () => {
    if (!order?.prepaidToken) return;
    await navigator.clipboard.writeText(order.prepaidToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-1">
            Order Not Found
          </h2>
          <p className="text-sm text-[var(--text-2)] mb-6">
            {error || "We couldn't find this order."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-6 py-3 text-sm font-bold text-[var(--canvas)] hover:opacity-90 transition-colors"
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
    order.status === "REJECTED" || order.status === "REJECTED";
  const isComplete = order.status === "ACCEPTED";
  const isActive = !isCancelled && !isComplete;
  const isDirectPay = order.payment?.method === "DIRECT";

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)]">
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-sm">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center gap-3">
            <Link
              href={order ? `/menu/${order.restaurant.slug}` : "/"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-[var(--text-1)]">Track Order</h1>
              <p className="text-[11px] text-[var(--text-3)]">Live updates</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-text)]">
                  Live
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <AnimatePresence>
          {paymentStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${
                paymentStatus === "success"
                  ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {paymentStatus === "success"
                ? "Payment successful!"
                : "Payment failed. Please try again or pay at counter."}
            </motion.div>
          )}
        </AnimatePresence>

        {order.prepaidToken && order.prepaidToken.status === "ACTIVE" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-dashed border-[var(--accent-border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent p-5"
          >
            <p className="text-[11px] font-semibold text-[var(--accent-text)] uppercase tracking-wider">
              Prepaid Token — show this at pickup
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h3 className="font-mono text-2xl font-black tracking-wider text-[var(--text-1)] break-all">
                {order.prepaidToken.token.slice(-12).toUpperCase()}
              </h3>
              <button
                onClick={copyToken}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shrink-0"
                aria-label="Copy token"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--text-2)]">
              Payment received. Present this token at the counter to start preparation.
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wider">
                Order ID
              </p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-xl font-black text-[var(--text-1)]">
                  {order.orderNo}
                </h2>
                <button
                  onClick={copyOrderId}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[var(--accent-hover)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {(order.tableNo || order.roomNo || order.type) && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {order.tableNo && (
                    <span className="text-xs text-[var(--text-2)]">
                      Table {order.tableNo}
                    </span>
                  )}
                  {order.roomNo && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                      <BedDouble className="h-3 w-3" />
                      Room {order.roomNo}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-3)]">
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
              <p className="text-xs text-[var(--text-3)]">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-lg font-extrabold text-[var(--accent)] mt-0.5">
                {formatPrice(order.total, order.restaurant.currency ?? "NPR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-soft)]">
            <div className="h-10 w-10 rounded-xl bg-[var(--text-1)]/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-[var(--text-1)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-1)] truncate">
                {order.restaurant.name}
              </p>
              <p className="text-[11px] text-[var(--text-3)] truncate">
                {order.restaurant.address}
              </p>
            </div>
            {order.restaurant.phone && (
              <a
                href={`tel:${order.restaurant.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--text-1)]/10 text-[var(--text-1)] hover:bg-[var(--text-1)]/20 transition-colors"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>

          {order.payment && (
            <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
              <PaymentBadge
                method={order.payment.method}
                status={order.payment.status}
              />
              {isDirectPay && (
                <p className="mt-2 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                  Please pay directly at the counter when collecting your order.
                </p>
              )}
            </div>
          )}

          {/* Cancel button — only for PENDING orders */}
          {order.status === "PENDING" && (
            <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
              {!cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                >
                  Cancel Order
                </button>
              ) : (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">Are you sure you want to cancel this order?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCancelConfirm(false)}
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2 text-sm font-semibold text-[var(--text-2)]"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={cancelOrder}
                      disabled={cancelling}
                      className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {cancelling ? "Cancelling..." : "Yes, Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Payment QR section — shown when payment is still pending */}
        {paymentQRs.length > 0 &&
          order.payment &&
          order.payment.status !== "COMPLETED" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setShowQRs(!showQRs)}
                className="w-full flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[var(--accent-text)]" />
                  <span className="text-sm font-bold text-[var(--accent-text)]">
                    Scan to Pay &middot; {formatPrice(order.total, order.restaurant.currency ?? "NPR")}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: showQRs ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-[var(--accent-text)]" />
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
                      <p className="text-[11px] text-[var(--accent-text)]">
                        Scan one of the QR codes below to complete your payment.
                      </p>
                      {paymentQRs.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() =>
                            setSelectedQR(selectedQR === qr.id ? null : qr.id)
                          }
                          className={`w-full rounded-xl border-2 p-3 text-left transition-all bg-[var(--canvas)] ${
                            selectedQR === qr.id
                              ? "border-[var(--accent)]"
                              : "border-[var(--border-soft)] hover:border-[var(--border)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                              <QrCode className="h-4 w-4 text-[var(--accent-text)]" />
                            </div>
                            <span className="text-sm font-bold text-[var(--text-1)]">
                              {qr.label}
                            </span>
                            <motion.div
                              animate={{
                                rotate: selectedQR === qr.id ? 180 : 0,
                              }}
                              className="ml-auto"
                            >
                              <ChevronDown className="h-4 w-4 text-[var(--text-3)]" />
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
                                  className="w-full max-h-72 object-contain rounded-xl bg-[var(--canvas)] border border-[var(--border-soft)] p-2"
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

        {/* Digital Payment Status & Actions */}
        {order.payment &&
          ["ESEWA", "KHALTI"].includes(order.payment.method) &&
          (order.payment.status === "PENDING" || order.payment.status === "FAILED") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-[var(--accent-border)] bg-[var(--accent-muted)] p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[var(--accent-text)]" />
                <span className="text-sm font-bold text-[var(--accent-text)]">
                  {order.payment.status === "FAILED"
                    ? "Payment was not completed"
                    : "Complete your payment"}
                </span>
              </div>
              <p className="text-xs text-[var(--accent-text)]">
                {order.payment.status === "FAILED"
                  ? "Your payment attempt was unsuccessful. You can try again below."
                  : `Complete your ${order.payment.method === "ESEWA" ? "eSewa" : "Khalti"} payment to get your order started.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      if (order.payment!.method === "ESEWA") {
                        const res = await apiFetch<{
                          gateway: { url: string; formData: Record<string, string> };
                        }>("/api/payments/initiate", {
                          method: "POST",
                          body: { orderId: order.id, method: "ESEWA" },
                        });
                        const form = document.createElement("form");
                        form.method = "POST";
                        form.action = res.gateway.url;
                        form.target = "_blank";
                        Object.entries(res.gateway.formData).forEach(([k, v]) => {
                          const input = document.createElement("input");
                          input.type = "hidden";
                          input.name = k;
                          input.value = v;
                          form.appendChild(input);
                        });
                        document.body.appendChild(form);
                        form.submit();
                        document.body.removeChild(form);
                      } else {
                        const res = await apiFetch<{ paymentUrl: string }>(
                          "/api/payments/initiate",
                          { method: "POST", body: { orderId: order.id, method: "KHALTI" } },
                        );
                        window.open(res.paymentUrl, "_blank");
                      }
                    } catch { /* retry failed */ }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-all shadow-sm"
                >
                  {order.payment.status === "FAILED" ? "Try Again" : "Complete Payment"}
                </button>
              </div>
            </motion.div>
          )}

        {/* Bank Transfer — Upload Proof or Verification Pending */}
        {order.payment?.method === "BANK" &&
          (order.payment.status === "PENDING" || order.payment.status === "AWAITING_VERIFICATION") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                {order.payment.status === "AWAITING_VERIFICATION" ? (
                  <>
                    <Clock className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-bold text-blue-900">
                      Verification Pending
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-bold text-blue-900">
                      Upload Bank Transfer Proof
                    </span>
                  </>
                )}
              </div>
              {order.payment.status === "AWAITING_VERIFICATION" ? (
                <p className="text-xs text-blue-700">
                  Your proof has been submitted. Staff will verify your payment — your order will be sent to the kitchen once confirmed.
                </p>
              ) : (
                <>
                  <p className="text-xs text-blue-700">
                    Upload a screenshot of your bank transfer. Your order will be sent to the kitchen once staff verifies it.
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { uploadFile } = await import("@/lib/upload");
                        const proofUrl = await uploadFile(file, "bank-proofs");
                        await apiFetch("/api/payments/bank-proof", {
                          method: "POST",
                          body: { orderId: order.id, proofUrl },
                        });
                        fetchOrder();
                      } catch { /* upload failed */ }
                    }}
                    className="w-full rounded-xl border border-blue-200 bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--text-2)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-200"
                  />
                </>
              )}
            </motion.div>
          )}

        {/* Payment Failed/Expired */}
        {order.payment &&
          (order.payment.status === "EXPIRED") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-700" />
                <span className="text-sm font-bold text-red-900">Payment Expired</span>
              </div>
              <p className="text-xs text-red-700">
                This payment has expired. Please place a new order to try again.
              </p>
            </motion.div>
          )}



        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[var(--canvas)] border border-[var(--border)] p-5 shadow-sm"
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
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                {order.status === "REJECTED"
                  ? "Order Rejected"
                  : "Order Cancelled"}
              </h3>
              <p className="text-sm text-[var(--text-3)] mt-1">
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--text-1)] mb-3"
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                Order Delivered!
              </h3>
              <p className="text-sm text-[var(--text-3)] mt-1">Enjoy your meal!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-6">
              {order.status === "ACCEPTED" ? (
                <div
                  ref={clockRef}
                  className="relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[var(--accent)] bg-[var(--canvas)] shadow-lg mb-3"
                >
                  <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] z-10" />
                  <div
                    ref={handRef}
                    className="absolute bottom-1/2 left-1/2 h-5 w-[2px] -translate-x-1/2 rounded-full bg-[var(--accent)] origin-bottom"
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
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                {STEPS[currentStep].label}
              </h3>
              <p className="text-sm text-[var(--text-3)] mt-0.5">
                {order.status === "PENDING" &&
                  "Your order has been sent to the kitchen"}
                {order.status === "ACCEPTED" &&
                  "Restaurant confirmed your order"}
                {order.status === "ACCEPTED" && "Chef is working on your food"}
                {order.status === "ACCEPTED" && "Your food is ready for pickup!"}
              </p>
            </div>
          )}

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
                          isDone ? step.bg : "bg-[var(--surface)]"
                        } transition-colors`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isDone ? "text-white" : "text-[var(--text-3)]"
                          }`}
                        />
                      </motion.div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ${
                            i < currentStep ? step.bg : "bg-[var(--surface-alt)]"
                          } transition-colors`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-sm font-bold ${
                          isDone ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isDone && i === 0 && order.createdAt && (
                        <p className="text-[11px] text-[var(--text-3)]">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 1 && order.acceptedAt && (
                        <p className="text-[11px] text-[var(--text-3)]">
                          {new Date(order.acceptedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 2 && order.preparingAt && (
                        <p className="text-[11px] text-[var(--text-3)]">
                          {new Date(order.preparingAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 3 && order.readyAt && (
                        <p className="text-[11px] text-[var(--text-3)]">
                          {new Date(order.readyAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {isDone && i === 4 && order.deliveredAt && (
                        <p className="text-[11px] text-[var(--text-3)]">
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
                          className="mt-0.5 h-1 w-16 rounded-full bg-[var(--accent)]/30"
                        >
                          <motion.div
                            animate={{ width: ["0%", "100%", "0%"] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="h-full rounded-full bg-[var(--accent)]"
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 shadow-sm"
        >
          <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
            Order Items
          </h3>
          <div className="space-y-2.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[11px] font-bold text-[var(--accent)]">
                    {item.quantity}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-1)]">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--text-2)]">
                  {formatPrice(item.price * item.quantity, order.restaurant.currency ?? "NPR")}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border-soft)] mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--text-1)]">Total</span>
            <span className="text-base font-extrabold text-[var(--accent)]">
              {formatPrice(order.total, order.restaurant.currency ?? "NPR")}
            </span>
          </div>
        </motion.div>

        {!isCancelled && (
          <TrackingCrossSell
            slug={order.restaurant.slug}
            currency={order.restaurant.currency ?? "NPR"}
            excludeItemNames={order.items.map((i) => i.name)}
            tableNo={order.tableNo}
          />
        )}

        <button
          onClick={() => setShowBill(!showBill)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3.5 px-5 flex items-center justify-between shadow-sm hover:bg-[var(--canvas-sub)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-sm font-bold text-[var(--text-1)]">
              View Invoice
            </span>
          </div>
          <motion.span
            animate={{ rotate: showBill ? 180 : 0 }}
            className="text-[var(--text-3)]"
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
              <BillSection bill={order.bill} order={order} currency={order.restaurant.currency ?? "NPR"} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cash/Counter/Direct — payment pending, waiting for staff verification */}
        {["CASH", "COUNTER", "DIRECT"].includes(order.payment?.method ?? "") &&
          order.payment?.status !== "COMPLETED" &&
          !["ACCEPTED", "REJECTED", "REJECTED"].includes(order.status) && (
            <div className="rounded-2xl border-2 border-[var(--accent-border)] bg-[var(--accent-muted)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--accent-text)]" />
                <span className="text-sm font-bold text-[var(--accent-text)]">
                  Verification Pending
                </span>
              </div>
              <p className="text-xs text-[var(--accent-text)]/80">
                Please pay at the counter. Your order will be sent to the kitchen once staff confirms payment.
              </p>
              <button
                onClick={() => setShowBill(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                View Bill
              </button>
            </div>
          )}

        {/* Any payment method — COMPLETED confirmation */}
        {order.payment?.status === "COMPLETED" &&
          !["ACCEPTED", "REJECTED", "REJECTED"].includes(order.status) && (
            <div className="rounded-2xl border-2 border-[var(--accent-border)] bg-[#fef9ef]/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent-text)]" />
                <span className="text-sm font-bold text-[var(--text-1)]">
                  Payment Verified
                </span>
              </div>
              <p className="text-xs text-[var(--accent-text)]/80">
                Your payment has been confirmed. Your order is being processed by the kitchen.
              </p>
            </div>
          )}

        <Link
          href={`/menu/${order.restaurant.slug}${order.tableNo ? `?table=${order.tableNo}` : ""}`}
          className="block w-full rounded-xl bg-[var(--text-1)] py-4 text-center text-sm font-bold text-[var(--canvas)] hover:opacity-90 transition-colors shadow-lg cursor-pointer"
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
