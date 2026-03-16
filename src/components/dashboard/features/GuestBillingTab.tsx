"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  CreditCard,
  Plus,
  Search,
  DoorOpen,
  Receipt,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Printer,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";

interface RoomCharge {
  id: string;
  item: string;
  amount: number;
  time: string;
  note: string;
}

interface GuestRoom {
  id: string;
  roomNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  charges: RoomCharge[];
  maxLimit: number;
  settled: boolean;
}

export default function GuestBillingTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [guests, setGuests] = useState<GuestRoom[]>([]);
  const [search, setSearch] = useState("");
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeRoom, setChargeRoom] = useState("");
  const [chargeItem, setChargeItem] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeNote, setChargeNote] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "settled">("all");
  const [maxLimitEnabled, setMaxLimitEnabled] = useState(true);

  const filtered = guests.filter((g) => {
    const matchSearch =
      g.guestName.toLowerCase().includes(search.toLowerCase()) ||
      g.roomNumber.includes(search);
    if (filter === "active") return matchSearch && !g.settled;
    if (filter === "settled") return matchSearch && g.settled;
    return matchSearch;
  });

  const totalUnsettled = guests
    .filter((g) => !g.settled)
    .reduce((sum, g) => sum + g.charges.reduce((s, c) => s + c.amount, 0), 0);

  const activeGuests = guests.filter((g) => !g.settled).length;

  const handleAddCharge = () => {
    if (!chargeRoom || !chargeItem || !chargeAmount) return;
    setGuests((prev) =>
      prev.map((g) =>
        g.roomNumber === chargeRoom
          ? {
              ...g,
              charges: [
                ...g.charges,
                {
                  id: `c${Date.now()}`,
                  item: chargeItem,
                  amount: parseFloat(chargeAmount),
                  time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                  note: chargeNote,
                },
              ],
            }
          : g,
      ),
    );
    setChargeItem("");
    setChargeAmount("");
    setChargeNote("");
    setShowAddCharge(false);
  };

  const handleSettleRoom = (id: string) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, settled: true } : g)));
  };

  const getRoomTotal = (g: GuestRoom) => g.charges.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Guest Room Billing
          </h2>
          <p className="text-sm text-gray-500 mt-1">Charge meals and services to guest rooms</p>
        </div>
        <button
          onClick={() => setShowAddCharge(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Charge
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Guests", value: String(activeGuests), icon: User, color: "#6366F1" },
          { label: "Unsettled Total", value: formatPrice(totalUnsettled, cur), icon: DollarSign, color: "#F59E0B" },
          { label: "Total Rooms", value: String(guests.length), icon: DoorOpen, color: "#10B981" },
          { label: "Settled Today", value: String(guests.filter((g) => g.settled).length), icon: Check, color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-gray-500">{s.label}</span>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Limit toggle */}
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Room Charge Limits</p>
          <p className="text-xs text-gray-500">Prevent charges exceeding the maximum per room</p>
        </div>
        <button
          onClick={() => setMaxLimitEnabled(!maxLimitEnabled)}
          className={`relative h-6 w-11 rounded-full transition-colors ${maxLimitEnabled ? "bg-indigo-500" : "bg-gray-200"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${maxLimitEnabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or room number..."
            className="w-full rounded-xl bg-gray-50 pl-10 pr-4 py-2.5 text-sm outline-none ring-1 ring-gray-200 focus:ring-indigo-400 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "settled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-indigo-100 text-indigo-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Charge Modal */}
      <AnimatePresence>
        {showAddCharge && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Add Room Charge</h3>
                <button onClick={() => setShowAddCharge(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Room Number</label>
                  <select
                    value={chargeRoom}
                    onChange={(e) => setChargeRoom(e.target.value)}
                    className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-indigo-400"
                  >
                    <option value="">Select room</option>
                    {guests
                      .filter((g) => !g.settled)
                      .map((g) => (
                        <option key={g.id} value={g.roomNumber}>
                          Room {g.roomNumber} - {g.guestName}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Item / Service</label>
                  <input
                    type="text"
                    value={chargeItem}
                    onChange={(e) => setChargeItem(e.target.value)}
                    placeholder="e.g., Club Sandwich x2"
                    className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{`Amount (${getCurrencySymbol(cur)})`}</label>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={chargeNote}
                    onChange={(e) => setChargeNote(e.target.value)}
                    placeholder="e.g., Room service"
                    className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddCharge}
                  disabled={!chargeRoom || !chargeItem || !chargeAmount}
                  className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Charge
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Rooms List */}
      <div className="space-y-3">
        {filtered.map((guest) => {
          const total = getRoomTotal(guest);
          const isExpanded = expandedRoom === guest.id;
          const limitPercent = (total / guest.maxLimit) * 100;
          const nearLimit = limitPercent > 80;

          return (
            <motion.div
              key={guest.id}
              layout
              className={`rounded-xl bg-white ring-1 ${guest.settled ? "ring-gray-100 opacity-60" : "ring-gray-200"} shadow-sm overflow-hidden`}
            >
              {/* Room header */}
              <button
                onClick={() => setExpandedRoom(isExpanded ? null : guest.id)}
                className="flex items-center gap-4 w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${guest.settled ? "bg-gray-100" : "bg-indigo-50"}`}>
                  <DoorOpen className={`h-5 w-5 ${guest.settled ? "text-gray-400" : "text-indigo-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">Room {guest.roomNumber}</span>
                    {guest.settled && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded">SETTLED</span>
                    )}
                    {!guest.settled && nearLimit && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">NEAR LIMIT</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{guest.guestName}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {guest.checkIn} → {guest.checkOut}
                    </span>
                    <span>{guest.charges.length} charges</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatPrice(total, cur)}</p>
                  {maxLimitEnabled && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${nearLimit ? "bg-amber-400" : "bg-indigo-400"}`}
                          style={{ width: `${Math.min(limitPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">/ {formatPrice(guest.maxLimit, cur)}</span>
                    </div>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Expanded charges */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                      {guest.charges.map((charge) => (
                        <div key={charge.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{charge.item}</p>
                            <p className="text-[11px] text-gray-400">
                              {charge.time}
                              {charge.note && ` · ${charge.note}`}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-gray-700">{formatPrice(charge.amount, cur)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-sm font-bold text-gray-700">Total</span>
                        <span className="text-base font-bold text-indigo-600">{formatPrice(total, cur)}</span>
                      </div>
                      {!guest.settled && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleSettleRoom(guest.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-xs font-semibold text-white hover:bg-green-400 transition-all"
                          >
                            <Check className="h-3 w-3" />
                            Settle & Checkout
                          </button>
                          <button className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-all">
                            <Printer className="h-3 w-3" />
                            Print Bill
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <CreditCard className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No guest rooms found</p>
          </div>
        )}
      </div>
    </div>
  );
}
