"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Receipt,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  category: { name: string };
  isAvailable: boolean;
}

interface BillItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number; // editable
  originalPrice: number;
}

export default function ManualBillingTab() {
  const { selectedRestaurant } = useRestaurant();
  const rid = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch menu items
  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    apiFetch<{ items?: MenuItem[]; menuItems?: MenuItem[] }>(
      `/api/restaurants/${rid}/menu`,
    )
      .then((data) => {
        const items = data.items ?? data.menuItems ?? (Array.isArray(data) ? data : []);
        setMenuItems(items as MenuItem[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rid]);

  // Filtered items
  const filtered = menuItems.filter(
    (m) =>
      m.isAvailable &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category?.name?.toLowerCase().includes(search.toLowerCase())),
  );

  // Add item to bill
  const addItem = useCallback((item: MenuItem) => {
    setBillItems((prev) => {
      const existing = prev.find((b) => b.menuItemId === item.id);
      if (existing) {
        return prev.map((b) =>
          b.menuItemId === item.id
            ? { ...b, quantity: b.quantity + 1 }
            : b,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          price: item.price,
          originalPrice: item.price,
        },
      ];
    });
  }, []);

  const updateQuantity = (menuItemId: string, delta: number) => {
    setBillItems((prev) =>
      prev
        .map((b) =>
          b.menuItemId === menuItemId
            ? { ...b, quantity: Math.max(0, b.quantity + delta) }
            : b,
        )
        .filter((b) => b.quantity > 0),
    );
  };

  const updatePrice = (menuItemId: string, price: number) => {
    setBillItems((prev) =>
      prev.map((b) =>
        b.menuItemId === menuItemId ? { ...b, price } : b,
      ),
    );
  };

  const removeItem = (menuItemId: string) => {
    setBillItems((prev) => prev.filter((b) => b.menuItemId !== menuItemId));
  };

  const subtotal = billItems.reduce(
    (sum, b) => sum + b.price * b.quantity,
    0,
  );
  const taxRate = selectedRestaurant?.taxRate ?? 13;
  const taxEnabled = selectedRestaurant?.taxEnabled ?? true;
  const tax = taxEnabled
    ? Math.round(subtotal * (taxRate / 100) * 100) / 100
    : 0;
  const total = subtotal + tax;

  // Submit the manual bill as an order
  const handleSubmit = async () => {
    if (!rid || billItems.length === 0) return;
    setSubmitting(true);
    try {
      const order = await apiFetch<{ id: string }>(
        `/api/restaurants/${rid}/orders`,
        {
          method: "POST",
          body: {
            tableNo: tableNo ? String(tableNo) : undefined,
            items: billItems.map((b) => ({
              name: b.name,
              quantity: b.quantity,
              price: b.price,
              menuItemId: b.menuItemId,
            })),
            type: "DINE_IN",
            paymentMethod: "COUNTER",
            note: `Manual billing - Table ${tableNo || "N/A"}`,
          },
        },
      );

      // Mark as delivered immediately (manual billing = already consumed)
      await apiFetch(`/api/restaurants/${rid}/orders/${order.id}`, {
        method: "PATCH",
        body: { status: "DELIVERED" },
      });

      setOrderId(order.id);
      setSuccess(true);
    } catch {
      // error handled by apiFetch
    } finally {
      setSubmitting(false);
    }
  };

  // Print bill
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Bill</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #333; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 13px; }
        .bold { font-weight: bold; }
        .total { font-size: 16px; font-weight: bold; margin-top: 8px; }
        h2 { margin: 0 0 4px; font-size: 16px; }
        @media print { body { margin: 0; padding: 10px; } }
      </style></head><body>
      <div class="center">
        <h2>${selectedRestaurant?.name ?? "Restaurant"}</h2>
        <p style="font-size:11px;margin:4px 0">${selectedRestaurant?.address ?? ""}</p>
        <p style="font-size:11px;margin:4px 0">${selectedRestaurant?.phone ?? ""}</p>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Table: ${tableNo || "N/A"}</span><span>${new Date().toLocaleString()}</span></div>
      <div class="divider"></div>
      ${billItems.map((b) => `<div class="row"><span>${b.quantity}x ${b.name}</span><span>${formatPrice(b.price * b.quantity, currency)}</span></div>`).join("")}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatPrice(subtotal, currency)}</span></div>
      ${taxEnabled ? `<div class="row"><span>Tax (${taxRate}%)</span><span>${formatPrice(tax, currency)}</span></div>` : ""}
      <div class="divider"></div>
      <div class="row total"><span>TOTAL</span><span>${formatPrice(total, currency)}</span></div>
      <div class="divider"></div>
      <div class="center" style="font-size:11px;margin-top:12px">Thank you for visiting!</div>
      <script>window.print();window.close();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    setBillItems([]);
    setTableNo("");
    setSuccess(false);
    setOrderId(null);
  };

  if (!rid) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Select a restaurant first
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Bill Created</h3>
        <p className="text-sm text-gray-500">
          Table {tableNo || "N/A"} &middot; {formatPrice(total, currency)}
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-[#3e1e0c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3e1e0c]/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Bill
          </button>
          <button
            onClick={handleReset}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            New Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-1">
      {/* Left: Menu items to add */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Table #</label>
            <input
              type="number"
              placeholder="#"
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-300"
              min={1}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="flex flex-col items-start rounded-xl border border-gray-200 p-3 text-left hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
              >
                <span className="text-xs text-gray-400 mb-0.5">
                  {item.category?.name}
                </span>
                <span className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 group-hover:text-amber-700">
                  {item.name}
                </span>
                <span className="text-sm font-bold text-amber-600 mt-auto pt-1">
                  {formatPrice(item.price, currency)}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-400 py-8">
                No items found
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: Bill summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col" ref={printRef}>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800">
            Bill {tableNo ? `- Table ${tableNo}` : ""}
          </h3>
        </div>

        {billItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8 text-sm text-gray-400">
            Tap menu items to add them
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 max-h-[40vh] overflow-y-auto mb-3">
              <AnimatePresence>
                {billItems.map((item) => (
                  <motion.div
                    key={item.menuItemId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400">Price:</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updatePrice(item.menuItemId, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 rounded border border-gray-200 px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-300"
                          min={0}
                          step={10}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-16 text-right">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                    <button
                      onClick={() => removeItem(item.menuItemId)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-semibold">{formatPrice(tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100">
                <span>Total</span>
                <span className="text-amber-600">{formatPrice(total, currency)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || billItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Bill & Pay
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                disabled={billItems.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
