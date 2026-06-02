"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  DollarSign,
  Wallet,
  Banknote,
  CheckCircle2,
  Receipt,
  Tag,
  SplitSquareHorizontal,
  QrCode,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";
import type { POSOrder } from "@/hooks/usePOSOrders";

interface BillDetails {
  id: string;
  billNo: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  paidVia: string | null;
}

interface Props {
  restaurantId: string;
  currency: string;
  orders: POSOrder[];
  onSplitBill: (orderId: string, orderNo: string, total: number) => void;
  onOptimisticUpdate: (orderId: string, patch: Partial<POSOrder>) => void;
  /** Optional: open a full-screen payment QR overlay for the customer. */
  onShowPaymentQR?: (amount: number) => void;
  /** Staff role — discount only visible to MANAGER / SUPER_ADMIN */
  staffRole?: string;
}

const BILLABLE_STATUSES = new Set([
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DELIVERED",
]);

const PAYMENT_METHODS = [
  {
    id: "CASH",
    label: "Cash",
    icon: DollarSign,
    color:
      "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[#b25c1c] hover:bg-[var(--accent-muted)]",
  },
  {
    id: "ESEWA",
    label: "eSewa",
    icon: Wallet,
    color:
      "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[#b25c1c] hover:bg-[var(--accent-muted)]",
  },
  {
    id: "KHALTI",
    label: "Khalti",
    icon: Wallet,
    color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  },
  {
    id: "BANK",
    label: "Bank",
    icon: Banknote,
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  },
];

async function staffFetch<T = unknown>(
  url: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

const DISCOUNT_ROLES = new Set(["MANAGER", "SUPER_ADMIN"]);

export default function POSBilling({
  restaurantId,
  currency,
  orders,
  onSplitBill,
  onOptimisticUpdate,
  onShowPaymentQR,
  staffRole,
}: Props) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [billMap, setBillMap] = useState<Record<string, BillDetails>>({});
  const [discountAmount, setDiscountAmount] = useState("");
  const [filter, setFilter] = useState<"unpaid" | "paid" | "all">("unpaid");

  const fetchBillMap = useCallback(() => {
    let active = true;
    staffFetch<Array<{ id: string; bill: BillDetails | null }>>(
      `/api/restaurants/${restaurantId}/billing?filter=all`,
    )
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        const map: Record<string, BillDetails> = {};
        data.forEach((o) => {
          if (o.bill) map[o.id] = o.bill;
        });
        setBillMap(map);
      })
      .catch(() => {
        // silent
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => fetchBillMap(), [fetchBillMap]);

  // Keep selectedOrder in sync with SSE updates and re-fetch bill data
  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((o) => o.id === selectedOrder.id);
    if (fresh && fresh.updatedAt !== selectedOrder.updatedAt) {
      setSelectedOrder(fresh);
      fetchBillMap();
    }
  }, [orders, selectedOrder, fetchBillMap]);

  const canDiscount = !staffRole || DISCOUNT_ROLES.has(staffRole.toUpperCase());

  const billable = orders.filter((o) => BILLABLE_STATUSES.has(o.status));
  const filtered = billable.filter((o) => {
    const isPaid = o.payment?.status === "COMPLETED";
    if (filter === "unpaid" && isPaid) return false;
    if (filter === "paid" && !isPaid) return false;
    if (!search) return true;
    return (
      o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      (o.guestName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      o.tableNo?.toString() === search
    );
  });

  const applyDiscount = () => {
    if (!selectedOrder || !discountAmount) return;
    const amount = parseFloat(discountAmount);
    setDiscountAmount("");
    // Fire and forget — billMap will refresh in background
    staffFetch(`/api/restaurants/${restaurantId}/billing/discount`, {
      method: "POST",
      body: JSON.stringify({ orderId: selectedOrder.id, discount: amount }),
    })
      .then(() => fetchBillMap())
      .catch(() => showToast("Failed to apply discount", "error"));
  };

  const collectPayment = (method: string) => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.id;
    // Optimistic: mark as paid instantly and close detail panel
    onOptimisticUpdate(orderId, { payment: { method, status: "COMPLETED" } });
    setSelectedOrder(null);
    staffFetch(`/api/restaurants/${restaurantId}/billing/collect`, {
      method: "POST",
      body: JSON.stringify({ orderId, method }),
    })
      .then(() => fetchBillMap())
      .catch(() => showToast("Failed to collect payment", "error"));
  };

  const bill = selectedOrder ? billMap[selectedOrder.id] : null;
  const isPaid = selectedOrder?.payment?.status === "COMPLETED";

  return (
    <div className="flex h-full">
      {/* Left panel — order list */}
      <div className="flex flex-col w-80 shrink-0 border-r border-[var(--border)] bg-[var(--canvas)]">
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[var(--border-soft)] space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-1)]">
            Billing
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-2)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-1.5">
            {(["unpaid", "paid", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all border ${
                  filter === f
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-[var(--canvas)] text-[var(--text-2)] border-[var(--border)] hover:border-gray-300 hover:text-[var(--text-2)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--text-3)]">
              <Receipt className="h-8 w-8 opacity-40" />
              <p className="text-sm">No orders</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const orderIsPaid = order.payment?.status === "COMPLETED";
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setDiscountAmount("");
                    }}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      isSelected
                        ? "bg-amber-50 border-l-2 border-l-amber-500"
                        : "hover:bg-[var(--canvas-sub)] border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--text-1)]">
                        #{order.orderNo}
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        {formatPrice(
                          billMap[order.id]?.total ?? order.total,
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.tableNo && (
                        <span className="text-xs text-[var(--text-3)]">
                          Table {order.tableNo}
                        </span>
                      )}
                      {order.guestName && (
                        <span className="text-xs text-[var(--text-3)] truncate">
                          {order.guestName}
                        </span>
                      )}
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          orderIsPaid
                            ? "bg-[var(--accent-muted)] text-[#b25c1c]"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {orderIsPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — bill detail */}
      <div className="flex-1 flex flex-col bg-[var(--canvas-sub)] overflow-hidden">
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-3)]">
            <div className="rounded-full bg-[var(--surface)] p-5">
              <Receipt className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">
              Select an order to view the bill
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Bill header */}
            <div className="shrink-0 px-6 py-4 bg-[var(--canvas)] border-b border-[var(--border)]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-lg font-bold text-[var(--text-1)]">
                    Order #{selectedOrder.orderNo}
                  </span>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-2)]">
                    {selectedOrder.tableNo && (
                      <span>Table {selectedOrder.tableNo}</span>
                    )}
                    {selectedOrder.guestName && (
                      <span>{selectedOrder.guestName}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isPaid
                      ? "bg-[var(--accent-muted)] text-[#b25c1c]"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Receipt breakdown */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between px-4 py-3"
                    >
                      <span className="text-sm text-[var(--text-2)]">
                        <span className="font-semibold text-[var(--text-1)]">
                          {item.quantity}x
                        </span>{" "}
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-1)]">
                        {formatPrice(item.price * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border-soft)] bg-[var(--canvas-sub)] px-4 py-3 space-y-2">
                  <div className="flex justify-between text-sm text-[var(--text-2)]">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {formatPrice(selectedOrder.subtotal, currency)}
                    </span>
                  </div>
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-sm text-[var(--text-2)]">
                      <span>Tax</span>
                      <span className="font-medium">
                        {formatPrice(selectedOrder.tax, currency)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-[var(--text-2)]">
                      <span>Delivery Fee</span>
                      <span className="font-medium">
                        {formatPrice(selectedOrder.deliveryFee, currency)}
                      </span>
                    </div>
                  )}
                  {bill?.serviceCharge ? (
                    <div className="flex justify-between text-sm text-[var(--text-2)]">
                      <span>Service Charge</span>
                      <span className="font-medium">
                        {formatPrice(bill.serviceCharge, currency)}
                      </span>
                    </div>
                  ) : null}
                  {bill?.discount ? (
                    <div className="flex justify-between text-sm text-[#b25c1c]">
                      <span>Discount</span>
                      <span className="font-semibold">
                        -{formatPrice(bill.discount, currency)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                    <span className="text-base font-semibold text-[var(--text-1)]">
                      Total
                    </span>
                    <span className="text-base font-bold text-amber-700">
                      {formatPrice(
                        bill?.total ?? selectedOrder.total,
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount input */}
              {!isPaid && canDiscount && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 shadow-sm">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-3">
                    <Tag className="h-3.5 w-3.5" />
                    Apply Discount
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Enter amount"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={applyDiscount}
                      disabled={!discountAmount}
                      className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Payment collection */}
              {!isPaid && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide">
                    Collect Payment
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          onClick={() => collectPayment(pm.id)}
                          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-sm font-semibold active:scale-95 transition-all ${pm.color}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        onSplitBill(
                          selectedOrder.id,
                          selectedOrder.orderNo,
                          bill?.total ?? selectedOrder.total,
                        )
                      }
                      className="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] active:scale-95 transition-all"
                    >
                      <SplitSquareHorizontal className="h-4 w-4" />
                      Split Bill
                    </button>
                    {onShowPaymentQR && (
                      <button
                        onClick={() =>
                          onShowPaymentQR(bill?.total ?? selectedOrder.total)
                        }
                        className="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-3.5 text-sm font-bold text-[var(--accent-text)] hover:bg-[var(--accent)]/20 active:scale-95 transition-all"
                      >
                        <QrCode className="h-4 w-4" />
                        Show QR
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Paid confirmation */}
              {isPaid && (
                <div className="flex items-center gap-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-4">
                  <CheckCircle2 className="h-5 w-5 text-[#b25c1c] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#b25c1c]">
                      Payment Collected
                    </p>
                    <p className="text-xs text-[#b25c1c] mt-0.5">
                      via {selectedOrder.payment?.method}
                      {bill?.paidVia ? ` (${bill.paidVia})` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
