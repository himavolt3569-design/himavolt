"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, Send, PauseCircle, CreditCard,
  UtensilsCrossed, ShoppingBag, ChevronDown, User, StickyNote, Hash,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface OrderLineItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface TableRecord {
  tableNo: number;
  label: string | null;
}

interface Props {
  items: OrderLineItem[];
  tables: TableRecord[];
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  initialTableNo?: number | null;
  onUpdateQty: (id: string, delta: number) => void;
  onVoidItem: (id: string) => void;
  onClear: () => void;
  onSendToKitchen: (type: "DINE_IN" | "TAKEAWAY", tableNo: number | null, guestName: string, note: string) => void;
  onHoldOrder: (guestName: string, note: string) => void;
  onSettle: () => void;
}

export default function POSOrderPanel({
  items, tables, currency, taxRate, taxEnabled, initialTableNo,
  onUpdateQty, onVoidItem, onClear, onSendToKitchen, onHoldOrder, onSettle,
}: Props) {
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [showTablePicker, setShowTablePicker] = useState(false);

  useEffect(() => {
    if (initialTableNo) {
      setSelectedTable(initialTableNo);
      setOrderType("DINE_IN");
    }
  }, [initialTableNo]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Panel header */}
      <div className="shrink-0 px-5 pt-4 pb-4 border-b border-gray-100 space-y-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Current Order</h2>
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                {totalItems}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Order type toggle — segmented control */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all ${
              orderType === "DINE_IN"
                ? "bg-amber-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Dine In
          </button>
          <button
            onClick={() => setOrderType("TAKEAWAY")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-l border-gray-200 transition-all ${
              orderType === "TAKEAWAY"
                ? "bg-amber-600 text-white border-amber-600"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Takeaway
          </button>
        </div>

        {/* Table selector — dine-in only */}
        {orderType === "DINE_IN" && (
          <div className="relative">
            <button
              onClick={() => setShowTablePicker(!showTablePicker)}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all ${
                selectedTable
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className={selectedTable ? "font-semibold" : ""}>
                  {selectedTable ? `Table ${selectedTable}` : "Select a table"}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${showTablePicker ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {showTablePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-44 overflow-y-auto"
                >
                  <button
                    onClick={() => { setSelectedTable(null); setShowTablePicker(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    No table
                  </button>
                  {tables.map((t) => (
                    <button
                      key={t.tableNo}
                      onClick={() => { setSelectedTable(t.tableNo); setShowTablePicker(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        selectedTable === t.tableNo
                          ? "bg-amber-50 text-amber-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Table {t.tableNo}{t.label ? ` — ${t.label}` : ""}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Guest name & note */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative flex-1">
            <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Order items list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4">
              <UtensilsCrossed className="h-7 w-7 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">No items added</p>
              <p className="text-xs text-gray-300 mt-0.5">Tap menu items to add them here</p>
            </div>
            <button
              onClick={onSettle}
              className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Settle existing order
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.price, currency)} each</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className="text-sm font-semibold text-gray-900 w-14 text-right">
                    {formatPrice(item.price * item.quantity, currency)}
                  </p>
                  <button
                    onClick={() => onVoidItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + action buttons */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 px-5 py-4 space-y-4">
          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium text-gray-700">{formatPrice(subtotal, currency)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax ({taxRate}%)</span>
                <span className="font-medium text-gray-700">{formatPrice(tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-base font-bold text-amber-700">{formatPrice(total, currency)}</span>
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onHoldOrder(guestName.trim(), note.trim())}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <PauseCircle className="h-4 w-4" />
              Hold
            </button>
            <button
              onClick={() => onSendToKitchen(orderType, orderType === "DINE_IN" ? selectedTable : null, guestName.trim(), note.trim())}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-500 active:scale-95 transition-all shadow-sm"
            >
              <Send className="h-4 w-4" />
              Send to Kitchen
            </button>
          </div>

          {/* Billing shortcut */}
          <button
            onClick={onSettle}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#eaa94d]/30 bg-[#fef9ef] py-2.5 text-sm font-semibold text-[#b25c1c] hover:bg-[#fef3dc] transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Go to Billing
          </button>
        </div>
      )}
    </div>
  );
}
