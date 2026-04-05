"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, DollarSign, CreditCard, Wallet, Banknote,
  CheckCircle2, Receipt, Tag, Loader2, SplitSquareHorizontal,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface BillOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  guestName: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  type: string;
  createdAt: string;
  items: OrderItem[];
  payment?: { method: string; status: string; amount: number } | null;
  bill?: { id: string; billNo: string; subtotal: number; tax: number; serviceCharge: number; discount: number; total: number; paidVia: string | null } | null;
}

interface Props {
  restaurantId: string;
  currency: string;
  onSplitBill: (order: BillOrder) => void;
}

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: DollarSign, color: "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" },
  { id: "ESEWA", label: "eSewa", icon: Wallet, color: "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" },
  { id: "KHALTI", label: "Khalti", icon: Wallet, color: "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100" },
  { id: "BANK", label: "Bank", icon: Banknote, color: "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" },
];

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed`);
  }
  return res.json();
}

export default function POSBilling({ restaurantId, currency, onSplitBill }: Props) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<BillOrder | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [filter, setFilter] = useState<"unpaid" | "paid" | "all">("unpaid");

  const fetchOrders = useCallback(async () => {
    try {
      const data = await staffFetch<BillOrder[]>(`/api/restaurants/${restaurantId}/billing?filter=${filter}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurantId, filter]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
    const id = setInterval(fetchOrders, 15000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    return o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      (o.guestName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (o.tableNo?.toString() === search);
  });

  const applyDiscount = async () => {
    if (!selectedOrder || !discountAmount) return;
    setApplyingDiscount(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/billing/discount`, {
        method: "POST",
        body: JSON.stringify({ orderId: selectedOrder.id, discount: parseFloat(discountAmount) }),
      });
      showToast("Discount applied", "success");
      setDiscountAmount("");
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to apply discount", "error");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const collectPayment = async (method: string) => {
    if (!selectedOrder) return;
    setCollecting(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/billing/collect`, {
        method: "POST",
        body: JSON.stringify({ orderId: selectedOrder.id, method }),
      });
      showToast(`Payment collected via ${method}`, "success");
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to collect", "error");
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Orders list */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        <div className="shrink-0 p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Billing</h2>
            <button onClick={fetchOrders} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, name, or table..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div className="flex gap-2">
            {(["unpaid", "paid", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                  filter === f ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No orders</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const isPaid = order.payment?.status === "COMPLETED";
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedOrder?.id === order.id ? "bg-amber-50 border-l-4 border-l-amber-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">#{order.orderNo}</span>
                      <span className="text-sm font-bold text-amber-700">{formatPrice(order.total, currency)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {order.tableNo && <span>Table {order.tableNo}</span>}
                      {order.guestName && <span>{order.guestName}</span>}
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Bill detail & payment */}
      <div className="w-[380px] shrink-0 flex flex-col bg-gray-50">
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Receipt className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">Select an order to view bill</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-black text-gray-900">#{selectedOrder.orderNo}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  selectedOrder.payment?.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {selectedOrder.payment?.status === "COMPLETED" ? "Paid" : "Unpaid"}
                </span>
              </div>
              {selectedOrder.tableNo && <p className="text-xs text-gray-500">Table {selectedOrder.tableNo}</p>}
              {selectedOrder.guestName && <p className="text-xs text-gray-500">{selectedOrder.guestName}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Items */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-gray-700">{item.quantity}x {item.name}</span>
                      <span className="font-semibold text-gray-900">{formatPrice(item.price * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal, currency)}</span>
                  </div>
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tax</span>
                      <span>{formatPrice(selectedOrder.tax, currency)}</span>
                    </div>
                  )}
                  {selectedOrder.bill?.serviceCharge ? (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Service Charge</span>
                      <span>{formatPrice(selectedOrder.bill.serviceCharge, currency)}</span>
                    </div>
                  ) : null}
                  {selectedOrder.bill?.discount ? (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(selectedOrder.bill.discount, currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-amber-700">{formatPrice(selectedOrder.bill?.total ?? selectedOrder.total, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Discount */}
              {selectedOrder.payment?.status !== "COMPLETED" && (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <label className="text-xs font-bold text-gray-600 mb-2 block flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Apply Discount
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Amount"
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <button
                      onClick={applyDiscount}
                      disabled={applyingDiscount || !discountAmount}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                    >
                      {applyingDiscount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment methods */}
              {selectedOrder.payment?.status !== "COMPLETED" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-600">Collect Payment</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          onClick={() => collectPayment(pm.id)}
                          disabled={collecting}
                          className={`flex items-center gap-2 rounded-xl border-2 p-3 text-xs font-bold transition-all disabled:opacity-50 ${pm.color}`}
                        >
                          <Icon className="h-4 w-4" />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => onSplitBill(selectedOrder)}
                    disabled={collecting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white p-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <SplitSquareHorizontal className="h-4 w-4" />
                    Split Bill
                  </button>
                </div>
              )}

              {/* Already paid */}
              {selectedOrder.payment?.status === "COMPLETED" && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-700">Payment Collected</p>
                    <p className="text-xs text-green-600">via {selectedOrder.payment.method}{selectedOrder.bill?.paidVia ? ` (${selectedOrder.bill.paidVia})` : ""}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
