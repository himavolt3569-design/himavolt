"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import {
  Utensils, Plus, Trash2, Edit2, Check, X, Loader2,
  Users, Clock, CreditCard, RefreshCw, TableProperties,
  User as UserIcon, ChevronRight, QrCode, Search, Download, Printer, Copy,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/context/ToastContext";
import { useResolvedRestaurantId } from "@/context/RestaurantContext";
import {
  useTables,
  useSetTables,
  useInvalidateTables,
  type Table as TableData,
} from "@/hooks/useTables";
import { buildQRCanvas } from "@/components/dashboard/qr/qrCanvas";
import { openBillWindow } from "@/lib/print-bill";
import QRCodesTab from "./QRCodesTab";

type TableStatus = "free" | "occupied" | "paid";

/** Placeholder grid shown while the real list is in flight. Matches the card
 *  geometry so the layout doesn't jump when the data lands. */
function TableGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      aria-busy="true"
      aria-label="Loading tables"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
        />
      ))}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-[var(--accent)] text-[var(--accent)]",
  ACCEPTED:  "bg-blue-100 text-blue-700",
  PREPARING: "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  READY:     "bg-[var(--accent-muted)] text-[var(--accent-text)]",
  DELIVERED: "bg-[var(--surface)] text-[var(--text-2)]",
};

/** Staff-chosen name is the identity; the numeric handle is only a fallback. */
function tableName(t: { label: string | null; tableNo: number }) {
  return t.label?.trim() || `Table ${t.tableNo}`;
}

function statusOf(t: TableData): TableStatus {
  if (!t.isOccupied) return "free";
  if (t.session?.order?.payment?.status === "COMPLETED" && t.session?.order?.status !== "REJECTED") return "paid";
  return "occupied";
}

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-emerald-500",
  occupied: "bg-amber-500",
  paid: "bg-sky-500",
};

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}


// ── Per-table QR modal (quick view / download without leaving the Tables tab) ──
function TableQRModal({
  table, slug, restaurantName, onClose,
}: {
  table: TableData;
  slug: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const name = tableName(table);
  // Encode the unguessable QR token so the table can't be spoofed via the URL.
  // Falls back to the legacy ?table= form only until the token backfills.
  const tableUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/menu/${slug}?${table.qrToken ? `t=${table.qrToken}` : `table=${table.tableNo}`}`;

  const download = async () => {
    if (!qrRef.current) return;
    setBusy(true);
    try {
      const canvas = await buildQRCanvas(qrRef.current, table.tableNo, restaurantName, slug, "classic", 3, table.label);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${slug || "table"}-${table.tableNo}-qr.png`;
      link.click();
      showToast(`QR for ${name} downloaded!`, "success");
    } catch {
      showToast("Failed to download QR code", "error");
    }
    setBusy(false);
  };

  const print = async () => {
    if (!qrRef.current) return;
    setBusy(true);
    try {
      const canvas = await buildQRCanvas(qrRef.current, table.tableNo, restaurantName, slug, "classic", 4, table.label);
      const image = canvas.toDataURL("image/png");
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`
          <html><head><title>${name} QR Code</title>
          <style>
            @media print { @page { margin: 0; } body { margin: 0; } }
            body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f9fafb; }
            img { width: 340px; height: auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
          </style></head>
          <body><img src="${image}" onload="window.print();" /></body></html>`);
        w.document.close();
      }
    } catch {
      showToast("Failed to print QR code", "error");
    }
    setBusy(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(tableUrl);
    showToast("Table link copied!", "success");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-[var(--text-1)]" title={name}>{name}</h3>
            <p className="text-[10px] text-[var(--text-3)]">Scan to order · #{table.tableNo}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-alt)]">
            <X className="h-4 w-4 text-[var(--text-2)]" />
          </button>
        </div>

        <div className="flex justify-center mb-5">
          <div ref={qrRef} className="relative flex h-[200px] w-[200px] items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
            <QRCode value={tableUrl} size={256} style={{ height: "100%", maxWidth: "100%", width: "100%" }} fgColor="#3e1e0c" bgColor="transparent" level="M" />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={download}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--text-1)] py-2.5 text-xs font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] transition-all disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download
          </button>
          <button
            onClick={print}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-50"
            title="Print"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={copy}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white transition-all"
            title="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}


function TableManager({ restaurantId, currency = "NPR" }: { restaurantId?: string; currency?: string }) {
  const { showToast } = useToast();
  const rid  = restaurantId;
  const cur  = currency;
  const canManage = true; // staff portal — management allowed for all who have table tab access

  // Shared cache — see src/hooks/useTables.ts. The QR sub-tab reads the same
  // entry, so both halves of this screen paint together and a mutation here is
  // reflected there with no cross-cache invalidation.
  const tablesQuery = useTables(rid);
  const tables = tablesQuery.tables;
  const meta = tablesQuery.meta;
  const loading = tablesQuery.isFirstLoad;
  const setTables = useSetTables(rid);
  const invalidate = useInvalidateTables(rid);
  const load = (_fresh = false) => invalidate();
  const [selected, setSelected] = useState<TableData | null>(null);
  const [qrTable,  setQrTable]  = useState<TableData | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  // Search & filter
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<"all" | TableStatus>("all");

  // Add-table form — name-first (number is auto-assigned by the backend)
  const [showAdd,   setShowAdd]   = useState(false);
  const [addLabel,  setAddLabel]  = useState("");
  const [addCap,    setAddCap]    = useState("4");
  const [addSaving, setAddSaving] = useState(false);

  const [showBulk,    setShowBulk]    = useState(false);
  const [bulkFrom,    setBulkFrom]    = useState("1");
  const [bulkTo,      setBulkTo]      = useState("20");
  const [bulkCap,     setBulkCap]     = useState("4");
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const [bulkProgress,setBulkProgress]= useState(0);

  // Edit-table form
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCap,   setEditCap]   = useState("");
  const [editSaving] = useState(false);

  const handleAdd = async () => {
    if (!rid || addSaving) {
      if (!rid) showToast("Restaurant not loaded — please refresh", "error");
      return;
    }
    setAddSaving(true);
    const label = addLabel.trim() || null;
    const capacity = parseInt(addCap) || 4;
    // Optimistic: show the new table instantly and close the modal; reconcile
    // (real id + auto-assigned number) in the background.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextNo = tables.reduce((m, t) => Math.max(m, t.tableNo), 0) + 1;
    setTables((prev) => [
      ...prev,
      { id: tempId, tableNo: nextNo, label, capacity, isActive: true, isOccupied: false, session: null },
    ]);
    setShowAdd(false); setAddLabel(""); setAddCap("4");
    try {
      const res = await fetch(`/api/restaurants/${rid}/tables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // No tableNo — backend auto-assigns the next free number.
        body: JSON.stringify({ label, capacity }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setTables((prev) => prev.filter((t) => t.id !== tempId)); // rollback
        showToast(body.error ?? "Failed to create table", "error");
        return;
      }
      showToast("Table added", "success");
      load(true); // reconcile real id/number
    } catch {
      setTables((prev) => prev.filter((t) => t.id !== tempId)); // rollback
      showToast("Failed to create table", "error");
    } finally {
      setAddSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!rid) return;
    const snapshot = tables;
    const label = editLabel.trim() || null;
    const capacity = parseInt(editCap) || 4;
    // Optimistic: apply the rename/capacity and close the editor instantly.
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, label, capacity } : t)));
    setEditId(null);
    try {
      const res = await fetch(`/api/restaurants/${rid}/tables/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, capacity }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setTables(snapshot); // rollback
        showToast(body.error ?? "Failed to update table", "error");
        return;
      }
      load(true);
    } catch {
      setTables(snapshot); // rollback
      showToast("Failed to update table", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!rid || !confirm("Delete this table?")) return;
    const snapshot = tables;
    // Optimistic: remove the table instantly.
    setTables((prev) => prev.filter((t) => t.id !== id));
    if (selected?.id === id) setSelected(null);
    try {
      const res = await fetch(`/api/restaurants/${rid}/tables/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setTables(snapshot); // rollback
        showToast(body.error ?? "Failed to delete table", "error");
        return;
      }
      load(true);
    } catch {
      setTables(snapshot); // rollback
      showToast("Failed to delete table", "error");
    }
  };

  const handleClearSession = async (orderId: string) => {
    if (!rid) return;
    const snapshot = tables;
    setClearingId(orderId);
    // Optimistic: free the table instantly.
    setTables((prev) =>
      prev.map((t) => (t.session?.order?.id === orderId ? { ...t, isOccupied: false, session: null } : t)),
    );
    setSelected(null);
    try {
      const res = await fetch(`/api/restaurants/${rid}/table-session/clear`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTables(snapshot); // rollback
        alert(err.error ?? "Failed to clear table. Check your permissions.");
        return;
      }
      await load(true);
    } catch {
      setTables(snapshot); // rollback
      alert("Failed to clear table. Please try again.");
    } finally {
      setClearingId(null);
    }
  };

  // Clear a table that's occupied by a browse-only session (no order yet) —
  // keyed by table number since there's no orderId to reference.
  const handleClearByTable = async (tableNo: number) => {
    if (!rid) return;
    const key = `table-${tableNo}`;
    const snapshot = tables;
    setClearingId(key);
    setTables((prev) =>
      prev.map((t) => (t.tableNo === tableNo ? { ...t, isOccupied: false, session: null } : t)),
    );
    setSelected(null);
    try {
      const res = await fetch(`/api/restaurants/${rid}/table-session/clear`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTables(snapshot); // rollback
        alert(err.error ?? "Failed to clear table. Check your permissions.");
        return;
      }
      await load(true);
    } catch {
      setTables(snapshot); // rollback
      alert("Failed to clear table. Please try again.");
    } finally {
      setClearingId(null);
    }
  };

  const handleBulkCreate = async () => {
    if (!rid || bulkSaving) return;
    const from = parseInt(bulkFrom);
    const to   = parseInt(bulkTo);
    const cap  = parseInt(bulkCap) || 4;
    if (!from || !to || from > to || to - from > 99) {
      alert("Invalid range. Max 100 tables at once.");
      return;
    }

    // Optimistic: drop the whole range in instantly (skipping numbers that
    // already exist) and close the modal. One request to the bulk endpoint
    // replaces the old per-table request loop, then we reconcile real ids.
    const existing = new Set(tables.map((t) => t.tableNo));
    const snapshot = tables;
    const optimistic: TableData[] = [];
    for (let n = from; n <= to; n++) {
      if (existing.has(n)) continue;
      optimistic.push({
        id: `temp-bulk-${n}`, tableNo: n, label: null, capacity: cap,
        isActive: true, isOccupied: false, session: null,
      });
    }

    setBulkSaving(true);
    setTables((prev) => [...prev, ...optimistic]);
    setShowBulk(false);
    setBulkFrom("1");
    setBulkTo("20");
    setBulkCap("4");

    try {
      const res = await fetch(`/api/restaurants/${rid}/tables/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, capacity: cap }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setTables(snapshot); // rollback
        showToast(body.error ?? "Failed to create tables", "error");
        return;
      }
      const data = await res.json().catch(() => ({}));
      showToast(
        data.created > 0
          ? `Created ${data.created} table(s)`
          : "Those tables already exist",
        "success",
      );
      load(true); // reconcile real ids/numbers
    } catch {
      setTables(snapshot); // rollback
      showToast("Failed to create tables", "error");
    } finally {
      setBulkSaving(false);
      setBulkProgress(0);
    }
  };

  const freeCount     = tables.filter((t) => statusOf(t) === "free").length;
  const occupiedCount = tables.filter((t) => statusOf(t) === "occupied").length;
  const paidCount     = tables.filter((t) => statusOf(t) === "paid").length;

  const q = query.trim().toLowerCase();
  const filtered = tables.filter((t) => {
    const matchesQuery =
      !q || tableName(t).toLowerCase().includes(q) || String(t.tableNo).includes(q);
    const matchesFilter = filter === "all" || statusOf(t) === filter;
    return matchesQuery && matchesFilter;
  });

  const FILTERS: { key: "all" | TableStatus; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: tables.length },
    { key: "free",     label: "Free",     count: freeCount },
    { key: "occupied", label: "Occupied", count: occupiedCount },
    { key: "paid",     label: "Paid",     count: paidCount },
  ];

  return (
    <div className="space-y-5">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
            <TableProperties className="h-5 w-5 text-[var(--accent-text)]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-1)]">Table Management</h2>
            <p className="text-xs text-[var(--text-3)]">
              {loading ? (
                // Don't report "0 tables · 0 free" before the list has loaded —
                // it reads as a fact about the venue, not as a loading state.
                <span className="opacity-60">Loading tables…</span>
              ) : (
                <>
                  {tables.length} tables · <span className="text-emerald-600 font-semibold">{freeCount} free</span>
                  {occupiedCount > 0 && <> · <span className="text-amber-600 font-semibold">{occupiedCount} occupied</span></>}
                  {paidCount > 0 && <> · <span className="text-sky-600 font-semibold">{paidCount} paid</span></>}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => load(true)} className="rounded-xl p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canManage && (
            <>
              <button
                onClick={() => setShowBulk(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#3e1e0c] px-3 py-2 text-xs font-bold text-[var(--text-1)] hover:bg-[var(--accent-muted)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Bulk Create
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--text-1)] px-3 py-2 text-xs font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Table
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search + status filters ───────────────────────────────── */}
      {tables.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or number…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === f.key
                    ? "bg-[var(--text-1)] text-[var(--canvas)]"
                    : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                }`}
              >
                {f.key !== "all" && <span className={`h-2 w-2 rounded-full ${STATUS_DOT[f.key]}`} />}
                {f.label}
                <span className={filter === f.key ? "opacity-80" : "text-[var(--text-3)]"}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        // A skeleton, never the empty state. "No tables configured" is a factual
        // claim about the venue, and until the fetch resolves we cannot make it —
        // asserting it over a venue with 20 tables is worse than showing nothing.
        <TableGridSkeleton />
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-3)] gap-3">
          <TableProperties className="h-10 w-10 opacity-30" />
          <p className="font-bold">No tables configured</p>
          {canManage && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add your first table
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-3)] gap-2">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm font-semibold">No tables match your search</p>
          <button onClick={() => { setQuery(""); setFilter("all"); }} className="text-xs font-bold text-[var(--accent-text)] hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((table) => {
            const status = statusOf(table);
            const bgClass = status === "free"
              ? "bg-[var(--accent-muted)] border-[var(--accent-border)] hover:border-[var(--accent)]"
              : status === "paid"
                ? "bg-[var(--accent-muted)] border-[var(--accent)] hover:border-[var(--accent)]"
                : "bg-[var(--accent)] border-[var(--accent-border)] hover:border-[var(--accent-border)]";
            const name = tableName(table);

            return (
              <motion.div
                key={table.id}
                layout
                role="button"
                tabIndex={0}
                onClick={() => setSelected(table)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(table);
                  }
                }}
                className={`group relative rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${bgClass}`}
              >
                {canManage && editId === table.id ? (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Table name"
                      className="w-full rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                    />
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-[var(--text-3)] shrink-0" />
                      <input
                        type="number"
                        value={editCap}
                        onChange={(e) => setEditCap(e.target.value)}
                        min={1} max={20}
                        className="w-full rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(table.id)}
                        disabled={editSaving}
                        className="flex-1 flex items-center justify-center rounded-lg bg-[var(--accent)] py-1 text-[10px] font-bold text-white"
                      >
                        {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="flex-1 flex items-center justify-center rounded-lg bg-[var(--surface-alt)] py-1 text-[10px] font-bold text-[var(--text-2)]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2 gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                          <span className="text-sm font-extrabold text-[var(--text-1)] truncate" title={name}>{name}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-3)]">#{table.tableNo}</p>
                      </div>
                      {canManage && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                             onClick={(e) => e.stopPropagation()}>
                          {meta?.slug && (
                            <button
                              onClick={() => setQrTable(table)}
                              className="rounded-md p-1 hover:bg-[var(--canvas)]/60"
                              title="View QR code"
                            >
                              <QrCode className="h-2.5 w-2.5 text-[var(--text-3)]" />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditId(table.id); setEditLabel(table.label ?? ""); setEditCap(String(table.capacity)); }}
                            className="rounded-md p-1 hover:bg-[var(--canvas)]/60"
                            title="Edit"
                          >
                            <Edit2 className="h-2.5 w-2.5 text-[var(--text-3)]" />
                          </button>
                          <button
                            onClick={() => handleDelete(table.id)}
                            className="rounded-md p-1 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)] mb-2">
                      <Users className="h-3 w-3" />
                      <span>{table.capacity} seats</span>
                    </div>

                    {table.isOccupied ? (
                      table.session?.order ? (
                        <div className="space-y-1">
                          <div className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLOR[table.session.order.status] ?? "bg-[var(--surface)] text-[var(--text-2)]"}`}>
                            {table.session.order.status}
                          </div>
                          <p className="text-[10px] text-[var(--text-2)] truncate">
                            #{table.session.order.orderNo}
                          </p>
                          <p className="text-xs font-bold text-[var(--text-1)]">
                            {formatPrice(table.session.order.total, cur)}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-[var(--text-3)]">
                            <Clock className="h-2.5 w-2.5" />
                            {elapsed(table.session.startedAt)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">
                            BROWSING
                          </div>
                          <p className="text-[10px] text-[var(--text-2)]">Reading menu</p>
                          <div className="flex items-center gap-1 text-[9px] text-[var(--text-3)] mt-2">
                            <Clock className="h-2.5 w-2.5" />
                            {table.session?.startedAt ? elapsed(table.session.startedAt) : "just now"}
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600">Available</p>
                    )}

                    <ChevronRight className="absolute bottom-3 right-3 h-3 w-3 text-[var(--text-3)]" />
                  </>
                )}
              </motion.div>
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
              className="w-full max-w-sm rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-[var(--text-1)] truncate" title={tableName(selected)}>
                    {tableName(selected)}
                  </h3>
                  <p className="text-xs text-[var(--text-3)] flex items-center gap-2">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {selected.capacity} seats</span>
                    <span>· #{selected.tableNo}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {meta?.slug && (
                    <button
                      onClick={() => setQrTable(selected)}
                      className="rounded-full bg-[var(--accent-muted)] p-2 text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                      title="View QR code"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setSelected(null)} className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-alt)]">
                    <X className="h-4 w-4 text-[var(--text-2)]" />
                  </button>
                </div>
              </div>

              {!selected.isOccupied ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                    <Utensils className="h-7 w-7 text-[var(--accent-text)]" />
                  </div>
                  <p className="text-sm font-bold text-emerald-600">Table is Available</p>
                  <p className="text-xs text-[var(--text-3)] text-center">
                    Customer can scan the QR code or staff can create a manual order for this table.
                  </p>
                </div>
              ) : selected.session?.order ? (() => {
                const order = selected.session.order;
                const isPaid = order.payment?.status === "COMPLETED";
                const guestDisplay = order.guestName ?? order.user?.name ?? "Guest";
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-[var(--accent)] border border-[var(--accent-border)] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-2)]">Order</span>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[order.status] ?? "bg-[var(--surface)]"}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-[var(--text-1)]">#{order.orderNo}</p>

                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                        <UserIcon className="h-3 w-3" />
                        <span>{guestDisplay}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-[var(--accent-border)]">
                        <span className="text-[var(--text-2)]">Total</span>
                        <span className="text-[var(--text-1)]">{formatPrice(order.total, cur)}</span>
                      </div>

                      {order.payment && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <CreditCard className="h-3 w-3 text-[var(--text-3)]" />
                          <span className="text-[var(--text-2)]">{order.payment.method}</span>
                          <span className={`rounded-md px-1.5 py-0.5 font-bold ${isPaid ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                            {isPaid ? "PAID" : "PENDING"}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)]">
                        <Clock className="h-3 w-3" />
                        Seated {elapsed(selected.session.startedAt)} ago
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openBillWindow(order.id, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                      >
                        View Bill
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleClearSession(order.id)}
                          disabled={clearingId === order.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 border border-red-100 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                        >
                          {clearingId === order.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                          {clearingId === order.id ? "Clearing..." : "Clear Table"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] p-4 text-center">
                    <p className="text-sm font-bold text-[var(--text-1)]">Browsing, no order yet</p>
                    <p className="text-xs text-[var(--text-3)] mt-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      On the menu {selected.session ? `${elapsed(selected.session.startedAt)} ago` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleClearByTable(selected.tableNo)}
                      disabled={clearingId === `table-${selected.tableNo}`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-50 border border-red-100 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      {clearingId === `table-${selected.tableNo}`
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                      {clearingId === `table-${selected.tableNo}` ? "Clearing..." : "Clear Table"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Per-table QR modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {qrTable && meta?.slug && (
          <TableQRModal
            table={qrTable}
            slug={meta.slug}
            restaurantName={meta.name || "HimaVolt"}
            onClose={() => setQrTable(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Add Table Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
               onClick={() => setShowAdd(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-extrabold text-[var(--text-1)]">Add New Table</h3>
                <button onClick={() => setShowAdd(false)} className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-alt)]">
                  <X className="h-4 w-4 text-[var(--text-2)]" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1 block">Table Name</label>
                  <input
                    value={addLabel} onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="e.g. Garden Table, Window Seat, VIP 1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && !addSaving) handleAdd(); }}
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                  />
                  <p className="text-[10px] text-[var(--text-3)] mt-1">Leave blank to name it by number automatically.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1 block">Capacity (seats)</label>
                  <input
                    type="number" value={addCap} onChange={(e) => setAddCap(e.target.value)}
                    min={1} max={30}
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)]">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={addSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-3 text-sm font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] disabled:opacity-40">
                  {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bulk Create Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
               onClick={() => !bulkSaving && setShowBulk(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-1)]">Bulk Create Tables</h3>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">Quickly create a numbered range, rename any of them later</p>
                </div>
                <button onClick={() => !bulkSaving && setShowBulk(false)} className="rounded-full bg-[var(--surface)] p-2 hover:bg-[var(--surface-alt)]">
                  <X className="h-4 w-4 text-[var(--text-2)]" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1 block">From *</label>
                    <input
                      type="number" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)}
                      placeholder="1" min={1}
                      className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1 block">To *</label>
                    <input
                      type="number" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)}
                      placeholder="20" min={1}
                      className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1 block">Seats per table</label>
                  <input
                    type="number" value={bulkCap} onChange={(e) => setBulkCap(e.target.value)}
                    min={1} max={30}
                    className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                  />
                </div>
                {parseInt(bulkFrom) > 0 && parseInt(bulkTo) >= parseInt(bulkFrom) && (
                  <div className="rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-2.5 text-xs text-[var(--accent-text)] font-semibold">
                    Will create {parseInt(bulkTo) - parseInt(bulkFrom) + 1} tables (Table {bulkFrom} to Table {bulkTo})
                  </div>
                )}
                {bulkSaving && bulkProgress > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[var(--text-2)]">
                      <span>Creating tables...</span>
                      <span>{bulkProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${bulkProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--text-3)] mb-4">
                QR codes are auto-generated for each table. Duplicate numbers are skipped.
              </p>

              <div className="flex gap-2">
                <button onClick={() => !bulkSaving && setShowBulk(false)} disabled={bulkSaving}
                  className="flex-1 rounded-xl border border-[var(--border)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleBulkCreate} disabled={bulkSaving || !bulkFrom || !bulkTo || parseInt(bulkFrom) > parseInt(bulkTo)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--text-1)] py-3 text-sm font-bold text-[var(--canvas)] hover:bg-[var(--text-2)] disabled:opacity-40">
                  {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {bulkSaving ? `Creating... ${bulkProgress}%` : "Create Tables"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Tables page = Table management + per-table QR codes, merged into one place
 * with a simple sub-tab switch (Restrox-style).
 */
export default function TablesTab({
  restaurantId,
  currency = "NPR",
}: {
  /** May be undefined on first render, before RestaurantContext resolves. */
  restaurantId?: string;
  currency?: string;
}) {
  const [view, setView] = useState<"tables" | "qr">("tables");
  // Resolve once, here, and hand the SAME id to both sub-tabs. Previously the
  // table board took this as a prop while the QR grid resolved it independently
  // from context — so the two halves of one screen disagreed about whether a
  // restaurant was available yet.
  const rid = useResolvedRestaurantId(restaurantId);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-2xl bg-[var(--canvas-sub)] p-1 ring-1 ring-[var(--border)]">
        {(["tables", "qr"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
              view === v
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {v === "tables" ? (
              <TableProperties className={`h-4 w-4 ${view === v ? "text-[var(--accent)]" : ""}`} />
            ) : (
              <QrCode className={`h-4 w-4 ${view === v ? "text-[var(--accent)]" : ""}`} />
            )}
            {v === "tables" ? "Tables" : "QR Codes"}
          </button>
        ))}
      </div>

      {view === "tables" ? (
        <TableManager restaurantId={rid} currency={currency} />
      ) : (
        <QRCodesTab restaurantId={rid} />
      )}
    </div>
  );
}
