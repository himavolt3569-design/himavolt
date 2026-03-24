"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils, Plus, Trash2, Edit2, Check, X, Loader2,
  Users, Clock, CreditCard, RefreshCw, TableProperties,
  User as UserIcon, ChevronRight,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";

/* ── Types ───────────────────────────────────────────────────────── */

interface TableData {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isActive: boolean;
  isOccupied: boolean;
  session: {
    id: string;
    startedAt: string;
    order: {
      id: string;
      orderNo: string;
      status: string;
      total: number;
      guestName: string | null;
      user: { name: string | null } | null;
      payment: { status: string; method: string } | null;
    } | null;
  } | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-orange-100 text-orange-700",
  ACCEPTED:  "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY:     "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-600",
};

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ── Component ───────────────────────────────────────────────────── */

export default function TablesTab() {
  const { selectedRestaurant } = useRestaurant();
  const rid  = selectedRestaurant?.id;
  const cur  = selectedRestaurant?.currency ?? "NPR";
  const role = (selectedRestaurant as unknown as Record<string, unknown>)?.staffRole as string | undefined;
  const canManage = !role || ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(role);

  const [tables,   setTables]   = useState<TableData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<TableData | null>(null);

  // Add-table form
  const [showAdd,   setShowAdd]   = useState(false);
  const [addNo,     setAddNo]     = useState("");
  const [addLabel,  setAddLabel]  = useState("");
  const [addCap,    setAddCap]    = useState("4");
  const [addSaving, setAddSaving] = useState(false);

  // Edit-table form
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCap,   setEditCap]   = useState("");
  const [editSaving,setEditSaving]= useState(false);

  const load = useCallback(async () => {
    if (!rid) return;
    try {
      const res = await fetch(`/api/restaurants/${rid}/tables`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTables(data.tables ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [rid]);

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const handleAdd = async () => {
    if (!rid || !addNo) return;
    setAddSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${rid}/tables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNo: parseInt(addNo), label: addLabel || null, capacity: parseInt(addCap) || 4 }),
      });
      if (!res.ok) { alert("Table number already exists"); return; }
      setShowAdd(false); setAddNo(""); setAddLabel(""); setAddCap("4");
      load();
    } catch { /* ignore */ }
    setAddSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!rid) return;
    setEditSaving(true);
    try {
      await fetch(`/api/restaurants/${rid}/tables/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel || null, capacity: parseInt(editCap) || 4 }),
      });
      setEditId(null);
      load();
    } catch { /* ignore */ }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!rid || !confirm("Delete this table?")) return;
    await fetch(`/api/restaurants/${rid}/tables/${id}`, { method: "DELETE", credentials: "include" });
    if (selected?.id === id) setSelected(null);
    load();
  };

  const handleClearSession = async (orderId: string) => {
    if (!rid) return;
    await fetch(`/api/restaurants/${rid}/table-session/clear`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setSelected(null);
    load();
  };

  if (!rid) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Select a restaurant first</div>
  );

  const occupied  = tables.filter((t) => t.isOccupied).length;
  const available = tables.filter((t) => !t.isOccupied).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <TableProperties className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#3e1e0c]">Table Management</h2>
            <p className="text-xs text-gray-400">
              {tables.length} tables · <span className="text-emerald-600 font-semibold">{available} free</span>
              {occupied > 0 && <> · <span className="text-orange-500 font-semibold">{occupied} occupied</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#3e1e0c] px-3 py-2 text-xs font-bold text-white hover:bg-[#2d1508] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Table
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-orange-400 inline-block" />Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-400 inline-block" />Paid
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <TableProperties className="h-10 w-10 opacity-30" />
          <p className="font-bold">No tables configured</p>
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add your first table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((table) => {
            const isPaid = table.session?.order?.payment?.status === "COMPLETED";
            const bgClass = !table.isOccupied
              ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400"
              : isPaid
                ? "bg-green-50 border-green-300 hover:border-green-400"
                : "bg-orange-50 border-orange-200 hover:border-orange-400";
            const dotClass = !table.isOccupied ? "bg-emerald-400" : isPaid ? "bg-green-500" : "bg-orange-400";

            return (
              <motion.button
                key={table.id}
                layout
                onClick={() => setSelected(table)}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${bgClass}`}
              >
                {/* Inline edit controls */}
                {canManage && editId === table.id ? (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400 shrink-0" />
                      <input
                        type="number"
                        value={editCap}
                        onChange={(e) => setEditCap(e.target.value)}
                        min={1} max={20}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(table.id)}
                        disabled={editSaving}
                        className="flex-1 flex items-center justify-center rounded-lg bg-emerald-500 py-1 text-[10px] font-bold text-white"
                      >
                        {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="flex-1 flex items-center justify-center rounded-lg bg-gray-200 py-1 text-[10px] font-bold text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">T{table.tableNo}</span>
                        </div>
                        {table.label && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[80px]">{table.label}</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setEditId(table.id); setEditLabel(table.label ?? ""); setEditCap(String(table.capacity)); }}
                            className="rounded-md p-1 hover:bg-white/60"
                          >
                            <Edit2 className="h-2.5 w-2.5 text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(table.id)}
                            className="rounded-md p-1 hover:bg-red-50"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
                      <Users className="h-3 w-3" />
                      <span>{table.capacity} seats</span>
                    </div>

                    {table.isOccupied && table.session?.order ? (
                      <div className="space-y-1">
                        <div className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLOR[table.session.order.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {table.session.order.status}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          #{table.session.order.orderNo}
                        </p>
                        <p className="text-xs font-bold text-[#3e1e0c]">
                          {formatPrice(table.session.order.total, cur)}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400">
                          <Clock className="h-2.5 w-2.5" />
                          {elapsed(table.session.startedAt)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600">Available</p>
                    )}

                    <ChevronRight className="absolute bottom-3 right-3 h-3 w-3 text-gray-300" />
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Table detail panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
               onClick={() => setSelected(null)}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-[#3e1e0c]">
                    Table {selected.tableNo}
                    {selected.label && <span className="text-sm font-normal text-gray-400 ml-1">· {selected.label}</span>}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {selected.capacity} seats
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full bg-gray-100 p-2 hover:bg-gray-200">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {!selected.isOccupied ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <Utensils className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-emerald-700">Table is Available</p>
                  <p className="text-xs text-gray-400 text-center">
                    Customer can scan the QR code or staff can create a manual order for this table.
                  </p>
                </div>
              ) : selected.session?.order ? (() => {
                const order = selected.session.order;
                const isPaid = order.payment?.status === "COMPLETED";
                const guestDisplay = order.guestName ?? order.user?.name ?? "Guest";
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">Order</span>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[order.status] ?? "bg-gray-100"}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-[#3e1e0c]">#{order.orderNo}</p>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <UserIcon className="h-3 w-3" />
                        <span>{guestDisplay}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-orange-100">
                        <span className="text-gray-500">Total</span>
                        <span className="text-[#3e1e0c]">{formatPrice(order.total, cur)}</span>
                      </div>

                      {order.payment && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <CreditCard className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-500">{order.payment.method}</span>
                          <span className={`rounded-md px-1.5 py-0.5 font-bold ${isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {isPaid ? "PAID" : "PENDING"}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        Seated {elapsed(selected.session.startedAt)} ago
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`/bill/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        View Bill
                      </a>
                      {canManage && (
                        <button
                          onClick={() => handleClearSession(order.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 border border-red-100 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Clear Table
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <p className="text-sm text-gray-400 text-center py-4">Session active but no order yet.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Table Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
               onClick={() => setShowAdd(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-extrabold text-[#3e1e0c]">Add New Table</h3>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-gray-100 p-2 hover:bg-gray-200">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Table Number *</label>
                  <input
                    type="number" value={addNo} onChange={(e) => setAddNo(e.target.value)}
                    placeholder="e.g. 1" min={1}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Label (optional)</label>
                  <input
                    value={addLabel} onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="e.g. Window Seat, VIP 1"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Capacity (seats)</label>
                  <input
                    type="number" value={addCap} onChange={(e) => setAddCap(e.target.value)}
                    min={1} max={30}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={!addNo || addSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#3e1e0c] py-3 text-sm font-bold text-white hover:bg-[#2d1508] disabled:opacity-40">
                  {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
