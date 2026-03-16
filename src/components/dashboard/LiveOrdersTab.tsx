"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Truck,
  RefreshCw,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useLiveOrders, type LiveOrder, type LiveOrderStatus } from "@/context/LiveOrdersContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import DineInRequestModal from "@/components/modals/DineInRequestModal";
import gsap from "gsap";

const STATUS_CONFIG: Record<
  LiveOrderStatus,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  PENDING: { label: "New", bg: "bg-orange-100", text: "text-orange-700", icon: Clock },
  ACCEPTED: { label: "Accepted", bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle2 },
  PREPARING: { label: "Preparing", bg: "bg-amber-100", text: "text-amber-700", icon: ChefHat },
  READY: { label: "Ready", bg: "bg-green-100", text: "text-green-700", icon: PackageCheck },
  DELIVERED: { label: "Delivered", bg: "bg-gray-100", text: "text-gray-600", icon: Truck },
  CANCELLED: { label: "Cancelled", bg: "bg-red-100", text: "text-red-600", icon: XCircle },
  REJECTED: { label: "Rejected", bg: "bg-red-100", text: "text-red-600", icon: XCircle },
};

const FILTER_OPTIONS: { value: LiveOrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "PENDING", label: "New" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "DELIVERED", label: "Delivered" },
];

function PreparingClock() {
  const clockRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div
      ref={clockRef}
      className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50"
    >
      <div className="absolute top-1/2 left-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600" />
      <div
        ref={handRef}
        className="absolute bottom-1/2 left-1/2 h-1.5 w-px -translate-x-1/2 rounded-full bg-amber-600 origin-bottom"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: LiveOrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
      {status === "PREPARING" ? <PreparingClock /> : <Icon className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function TimeAgo({ ts }: { ts: string }) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return <span className="text-[11px] text-gray-400">{secs}s ago</span>;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return <span className="text-[11px] text-gray-400">{mins}m ago</span>;
  return <span className="text-[11px] text-gray-400">{Math.floor(mins / 60)}h ago</span>;
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  ESEWA: Wallet,
  KHALTI: Wallet,
  BANK: Banknote,
  CASH: DollarSign,
};

const PAYMENT_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank",
  CASH: "Cash",
};

function PaymentBadge({ method, status }: { method: string; status: string }) {
  const Icon = PAYMENT_ICONS[method] || CreditCard;
  const label = PAYMENT_LABELS[method] || method;
  const isPaid = status === "COMPLETED";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isPaid
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
      {isPaid ? " Paid" : " Due"}
    </span>
  );
}

export default function LiveOrdersTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const { orders, loading, refresh, acceptOrder, rejectOrder, markPreparing, markReady, markDelivered } = useLiveOrders();
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<LiveOrderStatus | "ALL">("ALL");

  const filtered = orders.filter(
    (o) => filterStatus === "ALL" || o.status === filterStatus,
  );

  const newCount = orders.filter((o) => o.status === "PENDING").length;

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A2A]">Live Orders</h2>
          <p className="text-sm text-gray-400">
            {newCount > 0 ? (
              <span className="font-semibold text-[#FF9933]">
                {newCount} new order{newCount > 1 ? "s" : ""} waiting
              </span>
            ) : (
              "All orders managed"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-semibold text-green-600">Live</span>
          <button onClick={() => refresh()} className="p-0.5">
            <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filterStatus === opt.value
                ? "bg-[#0A4D3C] text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {opt.label}
            {opt.value === "PENDING" && newCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[#FF9933] px-1.5 py-0.5 text-[10px] text-white">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders — desktop table + mobile cards */}
      <div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <motion.tr
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => setSelectedOrder(order)}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50/70 last:border-b-0 cursor-pointer ${
                        order.status === "PENDING" ? "bg-orange-50/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#1F2A2A]">{order.orderNo}</span>
                        {order.note && (
                          <p className="text-[10px] text-gray-400 mt-0.5 italic">
                            &ldquo;{order.note}&rdquo;
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg font-black text-amber-800 ring-2 ring-amber-200/60">
                          {order.tableNo ?? "–"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {order.items.slice(0, 2).map((item, i) => (
                            <div key={i}>
                              <span className="font-semibold">{item.quantity}×</span> {item.name}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-gray-400">+{order.items.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#1F2A2A]">
                        {formatPrice(order.total, cur)}
                      </td>
                      <td className="px-4 py-4">
                        {order.payment ? (
                          <PaymentBadge method={order.payment.method} status={order.payment.status} />
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4">
                        <TimeAgo ts={order.createdAt} />
                      </td>
                      <td className="px-5 py-4">
                        <OrderActions
                          order={order}
                          onAccept={(et) => acceptOrder(order.id, et)}
                          onReject={() => rejectOrder(order.id)}
                          onPreparing={() => markPreparing(order.id)}
                          onReady={() => markReady(order.id)}
                          onDelivered={() => markDelivered(order.id)}
                        />
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {filtered.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setSelectedOrder(order)}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  order.status === "PENDING"
                    ? "border-orange-200 bg-orange-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1F2A2A]">{order.orderNo}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-sm font-black text-amber-800 ring-2 ring-amber-200/60">
                        {order.tableNo ?? "–"}
                      </span>
                      <span className="text-xs font-bold text-amber-700">Table {order.tableNo ?? "–"}</span>
                      <TimeAgo ts={order.createdAt} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#1F2A2A]">{formatPrice(order.total, cur)}</span>
                </div>
                {order.payment && (
                  <div className="mb-2">
                    <PaymentBadge method={order.payment.method} status={order.payment.status} />
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  {order.items.map((item, i) => (
                    <div key={i}>
                      {item.quantity}× {item.name}
                    </div>
                  ))}
                </div>
                <OrderActions
                  order={order}
                  onAccept={(et) => acceptOrder(order.id, et)}
                  onReject={() => rejectOrder(order.id)}
                  onPreparing={() => markPreparing(order.id)}
                  onReady={() => markReady(order.id)}
                  onDelivered={() => markDelivered(order.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Dine-in modal */}
      <DineInRequestModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAccept={(id) => { acceptOrder(id); setSelectedOrder(null); }}
        onReject={(id) => { rejectOrder(id); setSelectedOrder(null); }}
      />
    </div>
  );
}

function OrderActions({
  order,
  onAccept,
  onReject,
  onPreparing,
  onReady,
  onDelivered,
}: {
  order: LiveOrder;
  onAccept: (estimatedTime?: number) => void;
  onReject: () => void;
  onPreparing: () => void;
  onReady: () => void;
  onDelivered: () => void;
}) {
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [estTime, setEstTime] = useState(order.estimatedTime || 20);

  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  if (order.status === "PENDING") {
    if (showTimeInput) {
      return (
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <input
              type="number"
              min={5}
              max={120}
              value={estTime}
              onChange={(e) => setEstTime(Number(e.target.value))}
              className="w-10 text-center text-[11px] font-bold border-none outline-none bg-transparent"
            />
            <span className="text-[10px] text-gray-400">min</span>
          </div>
          <button
            onClick={(e) => stop(e, () => onAccept(estTime))}
            className="flex items-center gap-1 rounded-lg bg-[#0A4D3C] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#083a2d] transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" />
            Confirm
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={(e) => { e.stopPropagation(); setShowTimeInput(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#0A4D3C] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#083a2d] transition-colors"
        >
          <CheckCircle2 className="h-3 w-3" />
          Accept
        </button>
        <button
          onClick={(e) => stop(e, onReject)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors"
        >
          <XCircle className="h-3 w-3" />
          Reject
        </button>
      </div>
    );
  }

  if (order.status === "ACCEPTED") {
    return (
      <button
        onClick={(e) => stop(e, onPreparing)}
        className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600 transition-colors"
      >
        <ChefHat className="h-3 w-3" />
        Start Cooking
      </button>
    );
  }

  if (order.status === "PREPARING") {
    return (
      <button
        onClick={(e) => stop(e, onReady)}
        className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors"
      >
        <PackageCheck className="h-3 w-3" />
        Mark Ready
      </button>
    );
  }

  if (order.status === "READY") {
    return (
      <button
        onClick={(e) => stop(e, onDelivered)}
        className="flex items-center gap-1.5 rounded-lg bg-[#0A4D3C] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#083a2d] transition-colors"
      >
        <Truck className="h-3 w-3" />
        Delivered
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-gray-400 italic">
        {order.status === "DELIVERED" ? "Completed" : "Cancelled"}
      </span>
      {order.status === "DELIVERED" && (
        <a
          href={`/bill/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 hover:text-[#E23744] transition-all"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          View Bill
        </a>
      )}
    </span>
  );
}
