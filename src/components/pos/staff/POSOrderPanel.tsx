"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, Send, Loader2, PauseCircle, CreditCard,
  UtensilsCrossed, ShoppingBag, ChevronDown, User, StickyNote, Hash,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface OrderLineItem {
  id: string; // menuItemId or composite key
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
  submitting: boolean;
  onUpdateQty: (id: string, delta: number) => void;
  onVoidItem: (id: string) => void;
  onClear: () => void;
  onSendToKitchen: (type: "DINE_IN" | "TAKEAWAY", tableNo: number | null, guestName: string, note: string) => void;
  onHoldOrder: (guestName: string, note: string) => void;
  onSettle: () => void;
}

export default function POSOrderPanel({
  items, tables, currency, taxRate, taxEnabled, submitting,
  onUpdateQty, onVoidItem, onClear, onSendToKitchen, onHoldOrder, onSettle,
}: Props) {
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [showTablePicker, setShowTablePicker] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">
            Current Order
            {totalItems > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black text-amber-700">
                {totalItems}
              </span>
            )}
          </h2>
          {items.length > 0 && (
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear</button>
          )}
        </div>

        {/* Order type toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              orderType === "DINE_IN" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Dine In
          </button>
          <button
            onClick={() => setOrderType("TAKEAWAY")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              orderType === "TAKEAWAY" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Takeaway
          </button>
        </div>

        {/* Table selector (dine-in only) */}
        {orderType === "DINE_IN" && (
          <div className="relative mb-3">
            <button
              onClick={() => setShowTablePicker(!showTablePicker)}
              className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs transition-all hover:border-amber-300"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-gray-400" />
                <span className={selectedTable ? "font-semibold text-gray-800" : "text-gray-400"}>
                  {selectedTable ? `Table ${selectedTable}` : "Select table"}
                </span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showTablePicker ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showTablePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto"
                >
                  <button
                    onClick={() => { setSelectedTable(null); setShowTablePicker(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50"
                  >
                    No table
                  </button>
                  {tables.map((t) => (
                    <button
                      key={t.tableNo}
                      onClick={() => { setSelectedTable(t.tableNo); setShowTablePicker(false); }}
                      className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-amber-50 ${
                        selectedTable === t.tableNo ? "bg-amber-50 text-amber-700" : "text-gray-700"
                      }`}
                    >
                      Table {t.tableNo}{t.label ? ` - ${t.label}` : ""}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Guest name & note (compact) */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>
          <div className="relative flex-1">
            <StickyNote className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <UtensilsCrossed className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-xs font-medium">No items yet</p>
            <p className="text-xs mt-0.5">Tap items from the menu</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(item.price, currency)} ea</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onVoidItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs font-bold text-gray-900 w-16 text-right shrink-0">
                  {formatPrice(item.price * item.quantity, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals & actions */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax ({taxRate}%)</span>
                <span className="font-semibold">{formatPrice(tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="text-amber-700">{formatPrice(total, currency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onHoldOrder(guestName.trim(), note.trim())}
              disabled={submitting}
              className="flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              Hold
            </button>
            <button
              onClick={() => onSendToKitchen(orderType, orderType === "DINE_IN" ? selectedTable : null, guestName.trim(), note.trim())}
              disabled={submitting}
              className="flex items-center justify-center gap-1 rounded-lg bg-amber-700 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Kitchen
            </button>
            <button
              onClick={onSettle}
              disabled={submitting}
              className="flex items-center justify-center gap-1 rounded-lg bg-green-600 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition-colors disabled:opacity-50 shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Settle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
