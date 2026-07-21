"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, Printer, Search, Receipt,
  Loader2, Check, X, User, Utensils, ChevronDown,
  Banknote, CheckCircle2, Zap, Wine, Coffee, GlassWater, ChefHat,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useResolvedRestaurantId } from "@/context/RestaurantContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { printKOT, printBOT } from "@/lib/print-kot";
import { openBillWindow, autoPrintBill } from "@/lib/print-bill";


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
  counterWidth = 80,
  kitchenWidth = 80,
  printAutoReceipt = false,
}: {
  /** May be undefined on first render, before RestaurantContext resolves.
   *  It was typed `string` but the dashboard tab dispatcher passes
   *  `selectedRestaurant?.id` through an `any`, so undefined already reached
   *  here — TypeScript just couldn't see it. */
  restaurantId?: string;
  currency?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  counterWidth?: number;
  kitchenWidth?: number;
  printAutoReceipt?: boolean;
}) {
  // Fall back to the persisted selection so this screen isn't dead while the
  // context resolves.
  const rid      = useResolvedRestaurantId(restaurantId);
  // Paper widths from account print settings — bill uses the counter roll,
  // KOT/BOT use the kitchen roll.
  const billWidthMm = counterWidth === 58 ? 58 : 80;
  const kitchenWidthMm = kitchenWidth === 58 ? 58 : 80;
  const menuPath   = rid ? `/api/restaurants/${rid}/menu?light=1` : "";
  const tablesPath = rid ? `/api/restaurants/${rid}/tables` : "";

  // Seed from the warm GET cache so re-opening the tab paints instantly — no
  // skeleton — while the effect below revalidates in the background.
  const [menuItems,   setMenuItems]   = useState<MenuItem[]>(() => peekApiCache<MenuItem[]>(menuPath) ?? []);
  const [tables,      setTables]      = useState<TableOption[]>(() => peekApiCache<{ tables?: TableOption[] }>(tablesPath)?.tables ?? []);
  const [loading,     setLoading]     = useState(() => !peekApiCache(menuPath));
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

  // Fetch menu items and available tables. apiFetch adds an in-memory cache,
  // in-flight dedup, and automatic retry on the 503s prod's 1-connection pool
  // throws — so a transient hiccup no longer leaves the tab blank.
  useEffect(() => {
    if (!rid) return;
    // Only show the skeleton on a cold cache; a warm tab already painted.
    if (!peekApiCache(menuPath)) setLoading(true);
    Promise.all([
      apiFetch<{ items?: MenuItem[]; menuItems?: MenuItem[] } | MenuItem[]>(menuPath, { cacheTtl: 120_000 }),
      apiFetch<{ tables?: TableOption[] }>(tablesPath, { cacheTtl: 60_000 }).catch(() => ({ tables: [] })),
    ]).then(([menuData, tableData]) => {
      const md = menuData as { items?: MenuItem[]; menuItems?: MenuItem[] } | MenuItem[];
      const items = Array.isArray(md) ? md : md.items ?? md.menuItems ?? [];
      setMenuItems(items as MenuItem[]);
      setTables((tableData.tables ?? []) as TableOption[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [rid]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const order = await apiFetch<{ id: string; orderNo: string }>(
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
            // Fast Pay = counter sale: auto-accept so it skips the PENDING queue
            // AND the kitchen push (food is handed over at the counter now).
            ...(payMethod === "DIRECT" ? { autoAccept: true } : {}),
            note: `Counter order${tableNo ? ` - Table ${tableNo}` : ""}${guestName.trim() ? ` - ${guestName.trim()}` : ""}`,
          },
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
      await apiFetch(`/api/restaurants/${rid}/billing/collect`, {
        method: "POST",
        body: { orderId, method: "DIRECT" },
      });
      // Auto-print the settled receipt when the venue has it enabled.
      if (printAutoReceipt) autoPrintBill(orderId);
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
      <html><head><meta charset="UTF-8"><title>Tax Invoice</title>
      <style>
        * { box-sizing:border-box; }
        @page { size:${billWidthMm}mm auto; margin:0; }
        body { font-family:Arial,sans-serif; width:${billWidthMm}mm; max-width:${billWidthMm}mm; margin:0 auto; padding:${billWidthMm === 58 ? "4mm" : "5mm"}; color:#111; }
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
        .pay-badge { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:bold; }      </style></head><body>
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
            <div class="item-info"><div class="item-name">${b.name}</div><div class="item-unit">${b.quantity} × ${formatPrice(b.price, currency)}</div></div>
            <div class="item-tot">${formatPrice(b.price * b.quantity, currency)}</div>
          </div>`).join("")}` : ""}
      ${hasDrinks ? `<div class="sec" style="color:#1d4ed8">Bar / Drinks</div>
        ${drinkItems.map((b) => `
          <div class="item-row">
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

  // KOT — kitchen-only slip, food items only (shared implementation)
  const handlePrintKOT = (orderNoOverride?: string) => {
    const kotItems = foodItems.length > 0 ? foodItems : billItems; // fallback to all if no split
    printKOT(
      kotItems.map((b) => ({ name: b.name, quantity: b.quantity })),
      {
        restaurantName,
        tableNo: tableNo || null,
        orderNo: orderNoOverride ?? orderNo,
        guestName: guestName.trim() || null,
        width: kitchenWidthMm,
      },
    );
  };

  // BOT — bar-only ticket, drink items only (shared implementation)
  const handlePrintBOT = (orderNoOverride?: string) => {
    printBOT(
      drinkItems.map((b) => ({
        name: b.name,
        quantity: b.quantity,
        drinkCategory: b.drinkCategory,
      })),
      {
        restaurantName,
        tableNo: tableNo || null,
        orderNo: orderNoOverride ?? orderNo,
        guestName: guestName.trim() || null,
        width: kitchenWidthMm,
      },
    );
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
              Counter sale, won&apos;t appear in Live Orders or the kitchen queue.
            </motion.p>
          </div>

          {/* Drink/bar indicator — paper BOT slip is the only signal to the bar */}
          {hasDrinks && (
            <div className="w-full rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700">
              <Wine className="h-4 w-4 flex-shrink-0" />
              <span className="font-semibold">Bar items included, print BOT for the bar</span>
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
              <button
                onClick={() => openBillWindow(orderId, false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
              >
                <Receipt className="h-4 w-4" /> Bill
              </button>
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
            <span>{drinkItems.length} bar item{drinkItems.length > 1 ? "s" : ""}, BOT printed for bar</span>
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
            <button
              onClick={() => openBillWindow(orderId, false)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
            >
              <Receipt className="h-4 w-4" /> View Bill
            </button>
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
    // Extra bottom padding on mobile so the Total + Pay buttons clear the fixed
    // bottom nav bar and the floating chat button.
    <div className="space-y-4 p-1 pb-28 lg:pb-1">

    {/* Two-pane POS layout.
     *
     * The order panel used to be `lg:col-span-1` of a 3-col grid, i.e. a fixed
     * ONE THIRD. That looks fine on a phone (where it's full width) and gets
     * worse the bigger the screen: at 1440px the panel was still only 371px —
     * mobile width — while the menu column absorbed every extra pixel. Inside
     * it, an item row had to fit an image, the name, an editable price field, a
     * quantity stepper, a line total and a delete button in ~337px, leaving 61px
     * for the name+price column. It overflowed, so the dish name was clipped to
     * a sliver.
     *
     * The panel is a control surface, not a proportion of the viewport: it needs
     * a roughly constant, readable width, and the menu grid should take whatever
     * is left. clamp(400px, 34vw, 500px) was tuned by measuring the resulting
     * column widths: it gives the panel +115–165px over the old one-third split
     * across 1024–1440px (the common laptop/desktop range), and caps at 500px on
     * ultrawide so the extra space goes to the menu instead. 34vw — not 28vw —
     * because below ~34vw the panel loses to the old ⅓ at 1280px.
     */}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(400px,34vw,500px)]">

      <div className="order-2 lg:order-1 min-w-0 space-y-3">
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

        {(
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="flex flex-col items-start rounded-xl border border-[var(--border)] overflow-hidden text-left hover:border-[var(--accent-border)] hover:shadow-md transition-all group"
              >
                {item.imageUrl ? (
                  <div className="w-full h-16 sm:h-20 overflow-hidden bg-[var(--surface)] flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-full h-16 sm:h-20 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center flex-shrink-0">
                    <Utensils className="h-6 w-6 sm:h-7 sm:w-7 text-[var(--accent)]" />
                  </div>
                )}
                <div className="p-2 flex flex-col flex-1 w-full">
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

      {/* Right: Bill summary + customer info.
       *
       * On desktop this sticks to the top of the scroll area and spans the
       * viewport height, so the order list can use the space instead of
       * scrolling inside a 35vh box while ~90-390px sat empty underneath it.
       * On mobile it stays a plain stacked card (order-1, above the menu). */}
      <div
        className="order-1 lg:order-2 rounded-2xl border border-[var(--border)] bg-[var(--canvas)] flex flex-col lg:sticky lg:top-0 lg:max-h-[calc(100vh-7rem)]"
        ref={printRef}
      >

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
                  className="absolute z-30 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] shadow-xl overflow-hidden"
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

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPayMethod("DIRECT")}
              className={`flex flex-col items-center rounded-xl border-2 p-3.5 text-center transition-all ${
                payMethod === "DIRECT"
                  ? "border-teal-400 bg-teal-50"
                  : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
              }`}
            >
              <Zap className={`h-6 w-6 mb-1 ${payMethod === "DIRECT" ? "text-teal-600" : "text-[var(--text-3)]"}`} />
              <span className={`text-sm font-bold ${payMethod === "DIRECT" ? "text-teal-700" : "text-[var(--text-2)]"}`}>Fast Pay</span>
              <span className="text-[11px] text-[var(--text-3)] leading-tight">Pay now</span>
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("COUNTER")}
              className={`flex flex-col items-center rounded-xl border-2 p-3.5 text-center transition-all ${
                payMethod === "COUNTER"
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--border)] bg-[var(--canvas)] hover:border-[var(--border)]"
              }`}
            >
              <ChefHat className={`h-6 w-6 mb-1 ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}`} />
              <span className={`text-sm font-bold ${payMethod === "COUNTER" ? "text-[var(--accent-text)]" : "text-[var(--text-2)]"}`}>Manual Pay</span>
              <span className="text-[11px] text-[var(--text-3)] leading-tight">Pay later</span>
            </button>
          </div>

          {/* Simple, plain-English explainer of the selected mode. */}
          <div className="rounded-lg bg-[var(--canvas-sub)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--text-2)] ring-1 ring-[var(--border-soft)]">
            {payMethod === "COUNTER" ? (
              <><span className="font-bold text-[var(--accent-text)]">Kitchen cooks this order.</span> Take the payment later at the counter.</>
            ) : (
              <><span className="font-bold text-teal-700">Take the payment now.</span> For ready items, this does not go to the kitchen.</>
            )}
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
          <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
            {/* max-h-[35vh] is a mobile constraint: it stops the order list from
             * pushing the totals and Send button off a phone screen. On desktop
             * the panel is height-bounded already (lg:max-h-[calc(100vh-7rem)]),
             * so the list just flexes into whatever room is left — capping it
             * there only forced a scrollbar while space sat empty below. */}
            <div className="flex-1 min-h-0 space-y-2 max-h-[35vh] lg:max-h-none overflow-y-auto mb-3 mt-1">
              <AnimatePresence>
                {billItems.map((item) => (
                  <motion.div
                    key={item.menuItemId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`group flex items-center gap-2 sm:gap-3 rounded-2xl p-2 transition-colors ${item.isDrink ? "hover:bg-blue-50/50" : "hover:bg-[var(--canvas-sub)]"}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover flex-shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${item.isDrink ? "bg-blue-50 text-blue-400" : "bg-[var(--accent-muted)] text-[var(--accent)]"}`}>
                        {item.isDrink ? <Wine className="h-4 w-4 sm:h-5 sm:w-5" /> : <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] sm:text-sm font-bold text-[var(--text-1)] truncate leading-tight">{item.name}</p>
                        {item.isDrink && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 flex-shrink-0">BOT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-3)]">{currency}</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.menuItemId, parseFloat(e.target.value) || 0)}
                          className="w-12 sm:w-14 bg-transparent p-0 text-[11px] sm:text-[12px] font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] focus:bg-[var(--canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)] rounded transition-colors"
                          min={0} step={10}
                        />
                      </div>
                    </div>
                    <div className="flex items-center rounded-full bg-[var(--canvas)] ring-1 ring-[var(--border)] p-0.5 shadow-sm">
                      <button onClick={() => updateQuantity(item.menuItemId, -1)} className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full hover:bg-[var(--surface-alt)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                        <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <span className="w-5 sm:w-6 text-center text-[12px] sm:text-[13px] font-bold text-[var(--text-1)]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, 1)} className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-colors ${item.isDrink ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-[var(--accent-muted)] text-[var(--accent-text)] hover:brightness-95"}`}>
                        <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col items-end justify-center min-w-[50px] sm:min-w-[60px]">
                      <span className="text-[13px] sm:text-sm font-black text-[var(--text-1)]">{formatPrice(item.price * item.quantity, currency)}</span>
                    </div>
                    <button onClick={() => removeItem(item.menuItemId)} className="opacity-50 sm:opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-rose-500 transition-all p-1 -ml-1">
                      <X className="h-4 w-4 sm:h-4 sm:w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t border-[var(--border)] pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-2)]">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">Tax ({taxRate}%)</span>
                  <span className="font-semibold">{formatPrice(tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-[var(--border-soft)]">
                <span>Total</span>
                <span className="text-lg text-[var(--accent-text)]">{formatPrice(total, currency)}</span>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 mt-3">
              {payMethod === "DIRECT" ? (
                <>
                  <button
                    onClick={handleDirectPay}
                    disabled={submitting || billItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-teal-500 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white hover:bg-teal-600 disabled:opacity-40 transition-colors active:scale-[0.98] whitespace-nowrap"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <><Printer className="h-4 w-4 sm:h-5 sm:w-5 hidden sm:block" /> Print Bill</>}
                  </button>
                  <button
                    onClick={handleDirectConfirmOnly}
                    disabled={submitting || billItems.length === 0}
                    title="Save without printing"
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-teal-300 px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-40 transition-colors active:scale-[0.98]"
                  >
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || billItems.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-[var(--accent)] py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors active:scale-[0.98] whitespace-nowrap"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <><Check className="h-4 w-4 sm:h-5 sm:w-5" /> Send to Kitchen</>}
                  </button>
                  {/* KOT print */}
                  <button
                    onClick={() => handlePrintKOT()}
                    disabled={billItems.length === 0}
                    title="Print kitchen ticket"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-40 transition-colors active:scale-[0.98]"
                  >
                    <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  {/* BOT print — only shown when there are drink items */}
                  {hasDrinks && (
                    <button
                      onClick={() => handlePrintBOT()}
                      title="Print bar ticket"
                      className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-blue-700 hover:bg-blue-100 transition-colors active:scale-[0.98]"
                    >
                      <Wine className="h-4 w-4 sm:h-5 sm:w-5" />
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
