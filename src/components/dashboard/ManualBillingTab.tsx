"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, Printer, Search, Receipt,
  Loader2, Check, X, User, Utensils, ChevronDown,
  Banknote, CheckCircle2, Zap, Wine, Coffee, GlassWater,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}


interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  category: { name: string };
  isAvailable: boolean;
  imageUrl?: string;
  isDrink?: boolean;
  drinkCategory?: string | null; // "COLD" | "HOT" | "ALCOHOL"
}

interface BillItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  isDrink?: boolean;
  drinkCategory?: string | null;
}

interface TableOption {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isOccupied: boolean;
}


export default function ManualBillingTab({
  restaurantId,
  currency = "NPR",
  restaurantName = "",
  restaurantAddress = "",
  restaurantPhone = "",
  taxRate: taxRateProp = 13,
  taxEnabled: taxEnabledProp = true,
}: {
  restaurantId: string;
  currency?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  taxRate?: number;
  taxEnabled?: boolean;
}) {
  const rid      = restaurantId;

  const [menuItems,   setMenuItems]   = useState<MenuItem[]>([]);
  const [tables,      setTables]      = useState<TableOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [tableNo,     setTableNo]     = useState<number | "">("");
  const [guestName,   setGuestName]   = useState("");
  const [billItems,   setBillItems]   = useState<BillItem[]>([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [orderId,       setOrderId]       = useState<string | null>(null);
  const [orderNo,       setOrderNo]       = useState<string | null>(null);
  const [isPaid,        setIsPaid]        = useState(false);
  const [markingPaid,   setMarkingPaid]   = useState(false);
  const [showTables,    setShowTables]    = useState(false);
  const [payMethod,     setPayMethod]     = useState<"COUNTER" | "DIRECT">("COUNTER");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch menu items and available tables
  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    Promise.all([
      staffFetch<{ items?: MenuItem[]; menuItems?: MenuItem[] } | MenuItem[]>(`/api/restaurants/${rid}/menu`),
      staffFetch<{ tables?: TableOption[] }>(`/api/restaurants/${rid}/tables`).catch(() => ({ tables: [] })),
    ]).then(([menuData, tableData]) => {
      const md = menuData as { items?: MenuItem[]; menuItems?: MenuItem[] } | MenuItem[];
      const items = Array.isArray(md) ? md : md.items ?? md.menuItems ?? [];
      setMenuItems(items as MenuItem[]);
      setTables((tableData.tables ?? []) as TableOption[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [rid]);

  const availableTables = tables.filter((t) => !t.isOccupied);

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
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, originalPrice: item.price, imageUrl: item.imageUrl, isDrink: item.isDrink, drinkCategory: item.drinkCategory }];
    });
  }, []);

  const updateQuantity = (menuItemId: string, delta: number) =>
    setBillItems((prev) => prev.map((b) => b.menuItemId === menuItemId ? { ...b, quantity: Math.max(0, b.quantity + delta) } : b).filter((b) => b.quantity > 0));

  const updatePrice = (menuItemId: string, price: number) =>
    setBillItems((prev) => prev.map((b) => b.menuItemId === menuItemId ? { ...b, price } : b));

  const removeItem = (menuItemId: string) =>
    setBillItems((prev) => prev.filter((b) => b.menuItemId !== menuItemId));

  const subtotal = billItems.reduce((sum, b) => sum + b.price * b.quantity, 0);
  const taxRate   = taxRateProp;
  const taxEnabled = taxEnabledProp;
  const tax       = taxEnabled ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const total     = subtotal + tax;

  // Submit — creates order in system
  const handleSubmit = async (): Promise<{ id: string; orderNo: string } | null> => {
    if (!rid || billItems.length === 0) return null;
    setSubmitting(true);
    try {
      const order = await staffFetch<{ id: string; orderNo: string }>(
        `/api/restaurants/${rid}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
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
            // Fast Pay: skip PENDING queue, go directly to kitchen
            ...(payMethod === "DIRECT" ? { autoAccept: true } : {}),
            note: `Counter order${tableNo ? ` - Table ${tableNo}` : ""}${guestName.trim() ? ` - ${guestName.trim()}` : ""}`,
          }),
        },
      );
      setOrderId(order.id);
      setOrderNo(order.orderNo);
      setIsPaid(false);
      setSuccess(true);
      return order;
    } catch {
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // For Fast Pay: create order AND open the print dialog
  const handleDirectPay = async () => {
    if (!rid || billItems.length === 0) return;
    const order = await handleSubmit();
    handlePrint(order?.orderNo);
  };

  // For Fast Pay: create order WITHOUT printing
  const handleDirectConfirmOnly = async () => {
    if (!rid || billItems.length === 0) return;
    await handleSubmit();
  };

  // Mark Fast Pay bill as paid via billing/collect
  const handleMarkPaid = async () => {
    if (!rid || !orderId) return;
    setMarkingPaid(true);
    setIsPaid(true); // optimistic — instant UI feedback
    try {
      await staffFetch(`/api/restaurants/${rid}/billing/collect`, {
        method: "POST",
        body: JSON.stringify({ orderId, method: "DIRECT" }),
      });
    } catch {
      setIsPaid(false); // revert on failure
    } finally {
      setMarkingPaid(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────
  const foodItems  = billItems.filter((b) => !b.isDrink);
  const drinkItems = billItems.filter((b) => b.isDrink);
  const hasDrinks  = drinkItems.length > 0;
  const hasFood    = foodItems.length > 0;

  // Authentic Tax Invoice (Fast Pay) — all items, payment method shown
  const handlePrintBill = (orderNoOverride?: string) => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const displayNo = orderNoOverride ?? orderNo;
    const now = new Date();
    pw.document.write(`
      <html><head><title>Tax Invoice</title>
      <style>
        * { box-sizing:border-box; }
        body { font-family:Arial,sans-serif; max-width:300px; margin:0 auto; padding:16px; color:#111; }
        .center { text-align:center; }
        .divider { border-top:1px dashed #999; margin:8px 0; }
        .row { display:flex; justify-content:space-between; align-items:center; padding:3px 0; font-size:12px; }
        h2 { margin:0 0 2px; font-size:17px; font-weight:bold; }
        .lbl { font-size:10px; font-weight:bold; letter-spacing:1.5px; color:#555; text-transform:uppercase; background:#f3f4f6; border-radius:3px; padding:2px 8px; display:inline-block; margin:4px 0; }
        .sec { font-size:10px; font-weight:bold; color:#888; text-transform:uppercase; letter-spacing:1px; margin:6px 0 4px; }
        .item-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid #f0f0f0; }
        .item-img { width:38px; height:38px; object-fit:cover; border-radius:4px; flex-shrink:0; }
        .item-ph  { width:38px; height:38px; background:#f3f4f6; border-radius:4px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:18px; }
        .item-info { flex:1; min-width:0; }
        .item-name { font-size:12px; font-weight:600; }
        .item-unit { font-size:10px; color:#888; }
        .item-tot  { font-size:12px; font-weight:bold; white-space:nowrap; }
        .tot-row   { font-size:14px; font-weight:bold; }
        .pay-badge { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:bold; }
        @media print { body { margin:0; padding:10px; } }
      </style></head><body>
      <div class="center">
        <h2>${restaurantName || "Restaurant"}</h2>
        ${restaurantAddress ? `<p style="font-size:11px;margin:2px 0;color:#555">${restaurantAddress}</p>` : ""}
        ${restaurantPhone ? `<p style="font-size:11px;margin:2px 0;color:#555">${restaurantPhone}</p>` : ""}
        <div><span class="lbl">Tax Invoice</span></div>
      </div>
      <div class="divider"></div>
      <div class="row"><span style="font-size:11px;color:#555">Date: ${now.toLocaleDateString()}</span></div>
      ${displayNo ? `<div class="row"><span style="font-size:11px">Bill No:</span><span style="font-size:11px;font-weight:bold">#${displayNo}</span></div>` : ""}
      <div class="row"><span style="font-size:11px">Table:</span><span style="font-size:11px;font-weight:600">${tableNo || "N/A"}</span></div>
      ${guestName.trim() ? `<div class="row"><span style="font-size:11px">Guest:</span><span style="font-size:11px;font-weight:600">${guestName.trim()}</span></div>` : ""}
      <div class="divider"></div>
      ${hasFood ? `<div class="sec">Food</div>
        ${foodItems.map((b) => `
          <div class="item-row">
            ${b.imageUrl ? `<img class="item-img" src="${b.imageUrl}" alt="${b.name}" onerror="this.style.display='none'"/>` : `<div class="item-ph" style="background:#f3f4f6;border-radius:4px;display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>`}
            <div class="item-info"><div class="item-name">${b.name}</div><div class="item-unit">${b.quantity} × ${formatPrice(b.price, currency)}</div></div>
            <div class="item-tot">${formatPrice(b.price * b.quantity, currency)}</div>
          </div>`).join("")}` : ""}
      ${hasDrinks ? `<div class="sec" style="color:#1d4ed8">Bar / Drinks</div>
        ${drinkItems.map((b) => `
          <div class="item-row">
            ${b.imageUrl ? `<img class="item-img" src="${b.imageUrl}" alt="${b.name}" onerror="this.style.display='none'"/>` : `<div class="item-ph" style="background:#eff6ff;border-radius:4px;display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg></div>`}
            <div class="item-info"><div class="item-name">${b.name}</div><div class="item-unit">${b.quantity} × ${formatPrice(b.price, currency)}</div></div>
            <div class="item-tot">${formatPrice(b.price * b.quantity, currency)}</div>
          </div>`).join("")}` : ""}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatPrice(subtotal, currency)}</span></div>
      ${taxEnabled ? `<div class="row"><span>Tax (${taxRate}%)</span><span>${formatPrice(tax, currency)}</span></div>` : ""}
      <div class="divider"></div>
      <div class="row tot-row"><span>TOTAL</span><span>${formatPrice(total, currency)}</span></div>
      <div class="divider"></div>
      <div class="row"><span style="font-size:11px">Payment</span><span class="pay-badge">Fast Pay</span></div>
      <div class="center" style="margin-top:14px;font-size:10px;color:#777">Thank you for dining with us!</div>
      <script>window.onload=function(){window.print();window.close();};<\/script>
      </body></html>
    `);
    pw.document.close();
  };

  // KOT — kitchen-only slip, food items only
  const handlePrintKOT = (orderNoOverride?: string) => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const displayNo = orderNoOverride ?? orderNo;
    const now = new Date();
    const kotItems = foodItems.length > 0 ? foodItems : billItems; // fallback to all if no split
    pw.document.write(`
      <html><head><title>KOT</title>
      <style>
        body { font-family:'Courier New',monospace; max-width:300px; margin:0 auto; padding:16px; }
        .center { text-align:center; }
        .divider { border-top:1px dashed #333; margin:8px 0; }
        .row { display:flex; justify-content:space-between; padding:2px 0; font-size:13px; }
        .bold { font-weight:bold; }
        h2 { margin:0 0 2px; font-size:14px; }
        .kot-lbl { font-size:18px; font-weight:900; letter-spacing:3px; margin:4px 0 0; }
        .item { padding:3px 0; font-size:14px; font-weight:bold; }
        @media print { body { margin:0; padding:10px; } }
      </style></head><body>
      <div class="center">
        <div class="kot-lbl">*** KOT ***</div>
        <h2 style="margin-top:4px">${restaurantName || "Restaurant"}</h2>
        <div style="font-size:10px;color:#555">Kitchen Order Ticket</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Table: <b>${tableNo || "N/A"}</b></span></div>
      ${displayNo ? `<div class="row"><span>Order: <b>#${displayNo}</b></span></div>` : ""}
      ${guestName.trim() ? `<div class="row"><span>Guest: ${guestName.trim()}</span></div>` : ""}
      <div class="divider"></div>
      ${kotItems.map((b) => `
        <div class="item">${b.quantity} × ${b.name}</div>
      `).join("")}
      <div class="divider"></div>
      <div class="center" style="font-size:11px;margin-top:8px">— KITCHEN COPY —</div>
      <script>window.onload=function(){window.print();window.close();};<\/script>
      </body></html>
    `);
    pw.document.close();
  };

  // BOT — bar-only ticket, drink items only
  const handlePrintBOT = (orderNoOverride?: string) => {
    if (drinkItems.length === 0) return;
    const pw = window.open("", "_blank");
    if (!pw) return;
    const displayNo = orderNoOverride ?? orderNo;
    const now = new Date();
    const grouped: Record<string, BillItem[]> = {};
    drinkItems.forEach((b) => {
      const cat = b.drinkCategory || "OTHER";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(b);
    });
    const catLabel: Record<string, string> = { COLD: "Cold Drinks", HOT: "Hot Drinks", ALCOHOL: "Alcohol / Cocktails", OTHER: "Beverages" };
    pw.document.write(`
      <html><head><title>BOT</title>
      <style>
        body { font-family:'Courier New',monospace; max-width:300px; margin:0 auto; padding:16px; background:#fff; }
        .center { text-align:center; }
        .divider { border-top:2px dashed #1e3a5f; margin:8px 0; }
        .thin { border-top:1px dashed #93c5fd; margin:6px 0; }
        .row { display:flex; justify-content:space-between; padding:2px 0; font-size:13px; }
        h2 { margin:0 0 2px; font-size:13px; }
        .bot-lbl { font-size:20px; font-weight:900; letter-spacing:4px; color:#1e3a5f; margin:4px 0 0; }
        .cat-hdr { font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; color:#1d4ed8; margin:8px 0 4px; }
        .item { padding:3px 0; font-size:15px; font-weight:bold; color:#1e3a5f; }
        .item-sub { font-size:10px; color:#64748b; padding-left:16px; }
        .meta { font-size:11px; color:#555; }
        .badge { display:inline-block; background:#1e3a5f; color:#fff; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:3px; letter-spacing:1px; }
        @media print { body { margin:0; padding:10px; } }
      </style></head><body>
      <div class="center">
        <div class="bot-lbl">*** BOT ***</div>
        <h2 style="margin-top:4px">${restaurantName || "Restaurant"}</h2>
        <span class="badge">Bar Order Ticket</span>
      </div>
      <div class="divider"></div>
      <div class="row"><span class="meta">Table: <b>${tableNo || "N/A"}</b></span></div>
      ${displayNo ? `<div class="row"><span class="meta">Order: <b>#${displayNo}</b></span><span class="meta">${now.toLocaleDateString()}</span></div>` : ""}
      ${guestName.trim() ? `<div class="row"><span class="meta">Guest: ${guestName.trim()}</span></div>` : ""}
      <div class="divider"></div>
      ${Object.entries(grouped).map(([cat, items]) => `
        <div class="cat-hdr">${catLabel[cat] || cat}</div>
        ${items.map((b) => `
          <div class="item">${b.quantity} × ${b.name}</div>
          ${b.drinkCategory === "ALCOHOL" ? `<div class="item-sub" style="color:#dc2626;font-size:10px;padding-left:16px;display:flex;align-items:center;gap:3px;"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Verify age before serving</div>` : ""}
        `).join("")}
        <div class="thin"></div>
      `).join("")}
      <div class="center" style="font-size:11px;margin-top:8px;color:#1e3a5f;font-weight:bold">— BAR COPY —</div>
      <script>window.onload=function(){window.print();window.close();};<\/script>
      </body></html>
    `);
    pw.document.close();
  };

  // Smart print dispatcher — called from buttons
  const handlePrint = (orderNoOverride?: string) => {
    if (payMethod === "DIRECT") {
      handlePrintBill(orderNoOverride);
      if (hasDrinks) handlePrintBOT(orderNoOverride);
    } else {
      // COUNTER: KOT for food, BOT for drinks (auto both if mixed order)
      if (hasFood || !hasDrinks) handlePrintKOT(orderNoOverride);
      if (hasDrinks) handlePrintBOT(orderNoOverride);
    }
  };

  const handleReset = () => {
    setBillItems([]); setTableNo(""); setGuestName(""); setSuccess(false);
    setOrderId(null); setOrderNo(null); setIsPaid(false);
  };


  if (success) {
    /* Fast Pay success — counter sale: the server creates the order at
       DELIVERED, so it never enters Kitchen / Live Orders. Staff collect
       payment separately via the button below. */
    if (payMethod === "DIRECT") {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-4 max-w-sm mx-auto text-center">
          {/* Counter-sale confirmation — bold and instant */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/25"
          >
            <Zap className="h-10 w-10 text-white" />
          </motion.div>

          <div>
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-black text-[var(--text-1)] tracking-tight"
            >
              Sale recorded
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="text-sm text-[var(--text-2)] mt-1"
            >
              {orderNo && <span className="font-semibold">#{orderNo} &middot; </span>}
              {tableNo ? `Table ${tableNo}` : "Counter sale"}
              {guestName.trim() && <> &middot; {guestName.trim()}</>}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="text-2xl font-black text-[var(--accent-text)] mt-2 tabular-nums"
            >
              {formatPrice(total, currency)}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26 }}
              className="mt-1.5 text-[11px] text-[var(--text-3)]"
            >
              Counter sale — won&apos;t appear in Live Orders or the kitchen queue.
            </motion.p>
          </div>

          {/* Drink/bar indicator — paper BOT slip is the only signal to the bar */}
          {hasDrinks && (
            <div className="w-full rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700">
              <Wine className="h-4 w-4 flex-shrink-0" />
              <span className="font-semibold">Bar items included — print BOT for the bar</span>
            </div>
          )}

          {/* Payment collection — secondary action */}
          <AnimatePresence mode="wait">
            {!isPaid ? (
              <motion.button
                key="mark-paid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-3 text-sm font-bold text-[var(--canvas)] hover:opacity-80 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {markingPaid
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Banknote className="h-4 w-4" /> Collect Payment</>
                }
              </motion.button>
            ) : (
              <motion.div
                key="paid-confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full rounded-xl bg-emerald-50 border border-emerald-200 py-3 px-4 text-sm font-bold text-emerald-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Payment collected
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => handlePrintBill()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
            >
              <Printer className="h-4 w-4" /> Reprint
            </button>
            {hasDrinks && (
              <button
                onClick={() => handlePrintBOT()}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Wine className="h-4 w-4" /> BOT
              </button>
            )}
            {orderId && (
              <a
                href={`/bill/${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
              >
                <Receipt className="h-4 w-4" /> Bill
              </a>
            )}
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              New Bill
            </button>
          </div>
        </div>
      );
    }

    /* Manual Pay (COUNTER) success */
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
          <Check className="h-8 w-8 text-[var(--accent-text)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-1)]">
          {hasDrinks && hasFood ? "Order Sent to Kitchen & Bar" : hasDrinks ? "Order Sent to Bar" : "Order Sent to Kitchen"}
        </h3>
        <p className="text-sm text-[var(--text-2)]">
          {tableNo ? `Table ${tableNo}` : "No table assigned"}
          {guestName.trim() && <> &middot; {guestName.trim()}</>}
          {" "}&middot; {formatPrice(total, currency)}
        </p>
        {hasDrinks && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-4 py-2 border border-blue-100">
            <Wine className="h-3.5 w-3.5" />
            <span>{drinkItems.length} bar item{drinkItems.length > 1 ? "s" : ""} — BOT printed for bar</span>
          </div>
        )}
        {hasFood && (
          <p className="text-xs text-[var(--accent-text)] bg-[var(--accent-muted)] rounded-xl px-4 py-2 border border-[var(--accent-border)]">
            Customer pays at the counter after food is served.
          </p>
        )}
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          {hasFood && (
            <button
              onClick={() => handlePrintKOT()}
              className="flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--text-1)]/90 transition-colors"
            >
              <Printer className="h-4 w-4" /> Print KOT
            </button>
          )}
          {hasDrinks && (
            <button
              onClick={() => handlePrintBOT()}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 transition-colors"
            >
              <Wine className="h-4 w-4" /> Print BOT
            </button>
          )}
          {orderId && (
            <a
              href={`/bill/${orderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
            >
              <Receipt className="h-4 w-4" /> View Bill
            </a>
          )}
          <button
            onClick={handleReset}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
          >
            New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">

      {/* Payment method toggle — always at top on mobile */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPayMethod("COUNTER")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-center transition-all ${
            payMethod === "COUNTER"
              ? "border-[var(--accent)] bg-[var(--accent-muted)]"
              : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
          }`}
        >
          <Receipt className={`h-4 w-4 ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`} />
          <span className={`text-[11px] font-bold ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}>Manual Pay</span>
        </button>
        <button
          type="button"
          onClick={() => setPayMethod("DIRECT")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-center transition-all ${
            payMethod === "DIRECT"
              ? "border-teal-400 bg-teal-50"
              : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
          }`}
        >
          <Printer className={`h-4 w-4 ${payMethod === "DIRECT" ? "text-teal-600" : "text-[var(--text-3)]"}`} />
          <span className={`text-[11px] font-bold ${payMethod === "DIRECT" ? "text-teal-700" : "text-[var(--text-2)]"}`}>Fast Pay</span>
        </button>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="flex flex-col items-start rounded-xl border border-[var(--border)] overflow-hidden text-left hover:border-[var(--accent-border)] hover:shadow-md transition-all group"
              >
                {item.imageUrl ? (
                  <div className="w-full h-20 overflow-hidden bg-[var(--surface)] flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-full h-20 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center flex-shrink-0">
                    <Utensils className="h-7 w-7 text-[var(--accent)]" />
                  </div>
                )}
                <div className="p-2.5 flex flex-col flex-1 w-full">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] text-[var(--text-3)]">{item.category?.name}</span>
                    {item.isDrink && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-600 leading-none">
                        {item.drinkCategory === "ALCOHOL"
                          ? <Wine className="h-2.5 w-2.5" />
                          : item.drinkCategory === "HOT"
                          ? <Coffee className="h-2.5 w-2.5" />
                          : <GlassWater className="h-2.5 w-2.5" />}
                        BAR
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold leading-tight line-clamp-2 ${item.isDrink ? "group-hover:text-blue-700" : "group-hover:text-[var(--accent-text)]"} text-[var(--text-1)]`}>{item.name}</span>
                  <span className={`text-xs font-bold mt-auto pt-1 ${item.isDrink ? "text-blue-600" : "text-[var(--accent-text)]"}`}>{formatPrice(item.price, currency)}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-sm text-[var(--text-3)] py-8">No items found</p>
            )}
          </div>
        )}
      </div>

      {/* Right: Bill summary + customer info */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] flex flex-col" ref={printRef}>

        {/* Customer & table info */}
        <div className="p-4 border-b border-[var(--border-soft)] space-y-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTables(!showTables)}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm hover:border-[var(--accent-border)] transition-colors"
            >
              <div className="flex items-center gap-2 text-[var(--text-2)]">
                <Utensils className="h-4 w-4 text-[var(--text-3)]" />
                {tableNo ? (
                  <span className="font-semibold text-[var(--text-1)]">Table {tableNo}</span>
                ) : (
                  <span className="text-[var(--text-3)]">Select table (optional)</span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-[var(--text-3)] transition-transform ${showTables ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showTables && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => { setTableNo(""); setShowTables(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-[var(--text-3)] hover:bg-[var(--canvas-sub)]"
                  >
                    None / No table
                  </button>
                  <div className="px-3 py-2 border-t border-[var(--border-soft)]">
                    <input
                      type="number"
                      placeholder="Enter table number manually..."
                      min={1}
                      className="w-full rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseInt((e.target as HTMLInputElement).value);
                          if (v > 0) { setTableNo(v); setShowTables(false); }
                        }
                      }}
                    />
                  </div>
                  {availableTables.length > 0 && (
                    <div className="border-t border-[var(--border-soft)]">
                      <p className="px-3 py-1 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Available Tables</p>
                      {availableTables.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setTableNo(t.tableNo); setShowTables(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[var(--accent-muted)] transition-colors"
                        >
                          <span className="font-semibold text-[var(--text-2)]">
                            Table {t.tableNo}
                            {t.label && <span className="text-xs text-[var(--text-3)] ml-1">· {t.label}</span>}
                          </span>
                          <span className="text-xs text-[var(--text-3)]">{t.capacity} seats</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {tables.filter((t) => t.isOccupied).length > 0 && (
                    <div className="border-t border-[var(--border-soft)]">
                      <p className="px-3 py-1 text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Occupied</p>
                      {tables.filter((t) => t.isOccupied).map((t) => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                          <span>Table {t.tableNo}</span>
                          <span className="text-[10px] text-[var(--accent)] font-bold">OCCUPIED</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Guest name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMethod("COUNTER")}
              className={`flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition-all ${
                payMethod === "COUNTER"
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
              }`}
            >
              <Receipt className={`h-4 w-4 mb-1 ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`} />
              <span className={`text-[11px] font-bold ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}>Manual Pay</span>
              <span className="text-[10px] text-[var(--text-3)] leading-tight">Staff records payment</span>
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("DIRECT")}
              className={`flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition-all ${
                payMethod === "DIRECT"
                  ? "border-teal-400 bg-teal-50"
                  : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
              }`}
            >
              <Printer className={`h-4 w-4 mb-1 ${payMethod === "DIRECT" ? "text-teal-600" : "text-[var(--text-3)]"}`} />
              <span className={`text-[11px] font-bold ${payMethod === "DIRECT" ? "text-teal-700" : "text-[var(--text-2)]"}`}>Fast Pay</span>
              <span className="text-[10px] text-[var(--text-3)] leading-tight">Goes directly to kitchen</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <Receipt className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-1)]">
            Order {tableNo ? `· Table ${tableNo}` : ""}
          </h3>
        </div>

        {billItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8 px-4 text-sm text-[var(--text-3)]">
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
                    className={`flex items-center gap-2 rounded-lg p-2 ${item.isDrink ? "bg-blue-50 ring-1 ring-blue-100" : "bg-[var(--canvas-sub)]"}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-9 w-9 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${item.isDrink ? "bg-blue-100" : "bg-[var(--accent-muted)]"}`}>
                        {item.isDrink
                          ? <Wine className="h-4 w-4 text-blue-400" />
                          : <Utensils className="h-4 w-4 text-[var(--accent)]" />
                        }
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-[var(--text-1)] truncate">{item.name}</p>
                        {item.isDrink && (
                          <span className="text-[9px] font-bold px-1 rounded bg-blue-200 text-blue-700 flex-shrink-0">BOT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-[var(--text-3)]">Price:</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.menuItemId, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border border-[var(--border)] px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                          min={0} step={10}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.menuItemId, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-alt)] hover:bg-[var(--border)] transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, 1)} className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${item.isDrink ? "bg-blue-100 hover:bg-blue-200 text-blue-700" : "bg-[var(--accent-muted)] hover:bg-[var(--accent-muted)] text-[var(--accent-text)]"}`}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-2)] w-16 text-right">{formatPrice(item.price * item.quantity, currency)}</span>
                    <button onClick={() => removeItem(item.menuItemId)} className="text-[var(--text-3)] hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t border-[var(--border)] pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-2)]">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span className="font-semibold">{formatPrice(tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-[var(--border-soft)]">
                <span>Total</span>
                <span className="text-[var(--accent-text)]">{formatPrice(total, currency)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {payMethod === "DIRECT" ? (
                <>
                  <button
                    onClick={handleDirectPay}
                    disabled={submitting || billItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-40 transition-colors"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="h-4 w-4" /> Print &amp; Confirm</>}
                  </button>
                  <button
                    onClick={handleDirectConfirmOnly}
                    disabled={submitting || billItems.length === 0}
                    title="Confirm without printing"
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-teal-300 px-3 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-40 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || billItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Send to Kitchen</>}
                  </button>
                  {/* KOT print */}
                  <button
                    onClick={() => handlePrintKOT()}
                    disabled={billItems.length === 0}
                    title="Print KOT (Kitchen Order Ticket)"
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-40 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  {/* BOT print — only shown when there are drink items */}
                  {hasDrinks && (
                    <button
                      onClick={() => handlePrintBOT()}
                      disabled={billItems.length === 0}
                      title="Print BOT (Bar Order Ticket)"
                      className="flex items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                    >
                      <Wine className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
