"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, Printer, Search, Receipt,
  Loader2, Check, X, User, Utensils, ChevronDown,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";

/* ── Types ───────────────────────────────────────────────────────── */

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
  price: number;
  originalPrice: number;
}

interface TableOption {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isOccupied: boolean;
}

/* ── Component ───────────────────────────────────────────────────── */

export default function ManualBillingTab() {
  const { selectedRestaurant } = useRestaurant();
  const rid      = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";

  const [menuItems,   setMenuItems]   = useState<MenuItem[]>([]);
  const [tables,      setTables]      = useState<TableOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [tableNo,     setTableNo]     = useState<number | "">("");
  const [guestName,   setGuestName]   = useState("");
  const [billItems,   setBillItems]   = useState<BillItem[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [orderId,     setOrderId]     = useState<string | null>(null);
  const [showTables,  setShowTables]  = useState(false);
  const [payMethod,   setPayMethod]   = useState<"COUNTER" | "DIRECT">("COUNTER");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch menu items and available tables
  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ items?: MenuItem[]; menuItems?: MenuItem[] }>(`/api/restaurants/${rid}/menu`),
      fetch(`/api/restaurants/${rid}/tables`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ tables: [] })),
    ]).then(([menuData, tableData]) => {
      const items = menuData.items ?? menuData.menuItems ?? (Array.isArray(menuData) ? menuData : []);
      setMenuItems(items as MenuItem[]);
      setTables((tableData.tables ?? []) as TableOption[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [rid]);

  const availableTables = tables.filter((t) => !t.isOccupied);

  // Menu helpers
  const filtered = menuItems.filter(
    (m) =>
      m.isAvailable &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category?.name?.toLowerCase().includes(search.toLowerCase())),
  );

  const addItem = useCallback((item: MenuItem) => {
    setBillItems((prev) => {
      const existing = prev.find((b) => b.menuItemId === item.id);
      if (existing) return prev.map((b) => b.menuItemId === item.id ? { ...b, quantity: b.quantity + 1 } : b);
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, originalPrice: item.price }];
    });
  }, []);

  const updateQuantity = (menuItemId: string, delta: number) =>
    setBillItems((prev) => prev.map((b) => b.menuItemId === menuItemId ? { ...b, quantity: Math.max(0, b.quantity + delta) } : b).filter((b) => b.quantity > 0));

  const updatePrice = (menuItemId: string, price: number) =>
    setBillItems((prev) => prev.map((b) => b.menuItemId === menuItemId ? { ...b, price } : b));

  const removeItem = (menuItemId: string) =>
    setBillItems((prev) => prev.filter((b) => b.menuItemId !== menuItemId));

  // Totals
  const subtotal = billItems.reduce((sum, b) => sum + b.price * b.quantity, 0);
  const taxRate   = selectedRestaurant?.taxRate ?? 13;
  const taxEnabled = selectedRestaurant?.taxEnabled ?? true;
  const tax       = taxEnabled ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const total     = subtotal + tax;

  // Submit — creates order but does NOT auto-deliver. Food must flow through kitchen normally.
  const handleSubmit = async () => {
    if (!rid || billItems.length === 0) return;
    setSubmitting(true);
    try {
      const order = await apiFetch<{ id: string }>(
        `/api/restaurants/${rid}/orders`,
        {
          method: "POST",
          body: {
            tableNo: tableNo ? Number(tableNo) : undefined,
            guestName: guestName.trim() || undefined,
            items: billItems.map((b) => ({
              name: b.name,
              quantity: b.quantity,
              price: b.price,
              menuItemId: b.menuItemId,
            })),
            type: "DINE_IN",
            paymentMethod: payMethod,
            note: `Counter order${tableNo ? ` - Table ${tableNo}` : ""}${guestName.trim() ? ` - ${guestName.trim()}` : ""}`,
          },
        },
      );
      setOrderId(order.id);
      setSuccess(true);
    } catch {
      /* error handled by apiFetch */
    } finally {
      setSubmitting(false);
    }
  };

  // Thermal-style print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Bill</title>
      <style>
        body { font-family:'Courier New',monospace; max-width:300px; margin:0 auto; padding:20px; }
        .center { text-align:center; }
        .divider { border-top:1px dashed #333; margin:8px 0; }
        .row { display:flex; justify-content:space-between; padding:2px 0; font-size:13px; }
        .bold { font-weight:bold; }
        .total { font-size:16px; font-weight:bold; margin-top:8px; }
        h2 { margin:0 0 4px; font-size:16px; }
        @media print { body { margin:0; padding:10px; } }
      </style></head><body>
      <div class="center">
        <h2>${selectedRestaurant?.name ?? "Restaurant"}</h2>
        <p style="font-size:11px;margin:4px 0">${selectedRestaurant?.address ?? ""}</p>
        <p style="font-size:11px;margin:4px 0">${selectedRestaurant?.phone ?? ""}</p>
      </div>
      <div class="divider"></div>
      <div class="row">
        <span>Table: ${tableNo || "N/A"}</span>
        <span>${new Date().toLocaleString()}</span>
      </div>
      ${guestName.trim() ? `<div class="row"><span>Guest: ${guestName.trim()}</span></div>` : ""}
      <div class="divider"></div>
      ${billItems.map((b) => `<div class="row"><span>${b.quantity}x ${b.name}</span><span>${formatPrice(b.price * b.quantity, currency)}</span></div>`).join("")}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatPrice(subtotal, currency)}</span></div>
      ${taxEnabled ? `<div class="row"><span>Tax (${taxRate}%)</span><span>${formatPrice(tax, currency)}</span></div>` : ""}
      <div class="divider"></div>
      <div class="row total"><span>TOTAL</span><span>${formatPrice(total, currency)}</span></div>
      <div class="divider"></div>
      <div class="center" style="font-size:11px;margin-top:12px">Please pay at the counter. Thank you!</div>
      <script>window.print();window.close();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleReset = () => {
    setBillItems([]); setTableNo(""); setGuestName(""); setSuccess(false); setOrderId(null);
  };

  if (!rid) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Select a restaurant first</div>
  );

  /* ── Success State ───────────────────────────────────────────── */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Order Sent to Kitchen</h3>
        <p className="text-sm text-gray-500">
          {tableNo ? `Table ${tableNo}` : "No table assigned"}
          {guestName.trim() && <> &middot; {guestName.trim()}</>}
          {" "}&middot; {formatPrice(total, currency)}
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2 border border-amber-100">
          Customer pays at the counter after food is served.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-[#3e1e0c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3e1e0c]/90 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print Slip
          </button>
          {orderId && (
            <a
              href={`/bill/${orderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Receipt className="h-4 w-4" /> View Bill
            </a>
          )}
          <button
            onClick={handleReset}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            New Order
          </button>
        </div>
      </div>
    );
  }

  /* ── Main Layout ─────────────────────────────────────────────── */
  return (
    <div className="space-y-4 p-1">

      {/* Payment method toggle — always at top on mobile */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPayMethod("COUNTER")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-center transition-all ${
            payMethod === "COUNTER"
              ? "border-amber-400 bg-amber-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <Receipt className={`h-4 w-4 ${payMethod === "COUNTER" ? "text-amber-600" : "text-gray-400"}`} />
          <span className={`text-[11px] font-bold ${payMethod === "COUNTER" ? "text-amber-700" : "text-gray-600"}`}>Manual Pay</span>
        </button>
        <button
          type="button"
          onClick={() => setPayMethod("DIRECT")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-center transition-all ${
            payMethod === "DIRECT"
              ? "border-teal-400 bg-teal-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <Check className={`h-4 w-4 ${payMethod === "DIRECT" ? "text-teal-600" : "text-gray-400"}`} />
          <span className={`text-[11px] font-bold ${payMethod === "DIRECT" ? "text-teal-700" : "text-gray-600"}`}>Direct Pay</span>
        </button>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Left: Menu items */}
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
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
                <span className="text-xs text-gray-400 mb-0.5">{item.category?.name}</span>
                <span className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 group-hover:text-amber-700">{item.name}</span>
                <span className="text-sm font-bold text-amber-600 mt-auto pt-1">{formatPrice(item.price, currency)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-400 py-8">No items found</p>
            )}
          </div>
        )}
      </div>

      {/* Right: Bill summary + customer info */}
      <div className="rounded-2xl border border-gray-200 bg-white flex flex-col" ref={printRef}>

        {/* Customer & table info */}
        <div className="p-4 border-b border-gray-100 space-y-2.5">
          {/* Table selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTables(!showTables)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:border-amber-300 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-600">
                <Utensils className="h-4 w-4 text-gray-400" />
                {tableNo ? (
                  <span className="font-semibold text-[#3e1e0c]">Table {tableNo}</span>
                ) : (
                  <span className="text-gray-400">Select table (optional)</span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTables ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showTables && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => { setTableNo(""); setShowTables(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-400 hover:bg-gray-50"
                  >
                    None / No table
                  </button>
                  {/* Also allow manual entry */}
                  <div className="px-3 py-2 border-t border-gray-100">
                    <input
                      type="number"
                      placeholder="Enter table number manually..."
                      min={1}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseInt((e.target as HTMLInputElement).value);
                          if (v > 0) { setTableNo(v); setShowTables(false); }
                        }
                      }}
                    />
                  </div>
                  {availableTables.length > 0 && (
                    <div className="border-t border-gray-100">
                      <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Tables</p>
                      {availableTables.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setTableNo(t.tableNo); setShowTables(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-amber-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-700">
                            Table {t.tableNo}
                            {t.label && <span className="text-xs text-gray-400 ml-1">· {t.label}</span>}
                          </span>
                          <span className="text-xs text-gray-400">{t.capacity} seats</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {tables.filter((t) => t.isOccupied).length > 0 && (
                    <div className="border-t border-gray-100">
                      <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occupied</p>
                      {tables.filter((t) => t.isOccupied).map((t) => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                          <span>Table {t.tableNo}</span>
                          <span className="text-[10px] text-orange-500 font-bold">OCCUPIED</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guest name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Guest name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
          </div>

          {/* Payment method toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMethod("COUNTER")}
              className={`flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition-all ${
                payMethod === "COUNTER"
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Receipt className={`h-4 w-4 mb-1 ${payMethod === "COUNTER" ? "text-amber-600" : "text-gray-400"}`} />
              <span className={`text-[11px] font-bold ${payMethod === "COUNTER" ? "text-amber-700" : "text-gray-600"}`}>Manual Pay</span>
              <span className="text-[10px] text-gray-400 leading-tight">Staff records payment</span>
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("DIRECT")}
              className={`flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition-all ${
                payMethod === "DIRECT"
                  ? "border-teal-400 bg-teal-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Check className={`h-4 w-4 mb-1 ${payMethod === "DIRECT" ? "text-teal-600" : "text-gray-400"}`} />
              <span className={`text-[11px] font-bold ${payMethod === "DIRECT" ? "text-teal-700" : "text-gray-600"}`}>Direct Pay</span>
              <span className="text-[10px] text-gray-400 leading-tight">Customer pays at counter</span>
            </button>
          </div>
        </div>

        {/* Bill header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <Receipt className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800">
            Order {tableNo ? `· Table ${tableNo}` : ""}
          </h3>
        </div>

        {billItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8 px-4 text-sm text-gray-400">
            Tap menu items on the left to add
          </div>
        ) : (
          <div className="flex-1 flex flex-col px-4 pb-4">
            <div className="flex-1 space-y-2 max-h-[35vh] overflow-y-auto mb-3 mt-1">
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
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400">Price:</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.menuItemId, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border border-gray-200 px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-300"
                          min={0} step={10}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.menuItemId, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-16 text-right">{formatPrice(item.price * item.quantity, currency)}</span>
                    <button onClick={() => removeItem(item.menuItemId)} className="text-gray-400 hover:text-red-500 transition-colors">
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
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Send to Kitchen</>}
              </button>
              <button
                onClick={handlePrint}
                disabled={billItems.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
