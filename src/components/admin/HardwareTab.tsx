"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Loader2,
  Cpu,
  Printer,
  MonitorSmartphone,
  Laptop,
  Check,
  X,
  Clock,
  ExternalLink,
  Archive,
  Wallet,
  Save,
  BadgeCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import HardwareImageUpload from "@/components/hardware/HardwareImageUpload";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
  status: string;
  rejectionNote: string | null;
  isPlatformListing: boolean;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string | null;
  sellerPayoutNote: string;
  sellerPaymentQr: string;
  createdAt: string;
  orderCount: number;
  commissionOwed: number;
}

interface Order {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  shippingAddress: string | null;
  proofUrl: string | null;
  rejectionNote: string | null;
  createdAt: string;
  listing: { name: string; type: string; isPlatformListing: boolean; sellerName: string } | null;
}

interface CommissionRow {
  listingId: string;
  name: string;
  sellerName: string;
  sellerPhone: string;
  confirmedOrders: number;
  commissionEarned: number;
  settled: number;
  owed: number;
}

interface Payout {
  method: string;
  label: string;
  identifier: string;
  instructions: string;
}

type SubTab = "catalog" | "review" | "orders" | "commission";

const TYPE_OPTIONS = ["Terminal", "Screen", "Printer", "Accessory"];
const TYPE_ICON: Record<string, typeof Cpu> = {
  Terminal: Laptop,
  Screen: MonitorSmartphone,
  Printer: Printer,
  Accessory: Cpu,
};

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "Terminal",
  price: "",
  stock: "",
  imageUrl: "",
};

/* ── Lightweight text/number prompt modal ──────────────────────────── */

function PromptModal({
  open,
  title,
  label,
  placeholder,
  numeric,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  numeric?: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) setValue("");
  }, [open]);
  if (!open) return null;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-white rounded-3xl shadow-2xl p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4">
          {label}
        </label>
        <input
          autoFocus
          type={numeric ? "number" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
        />
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="px-5 py-2.5 rounded-xl font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-sm disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </>
  );
}

const STATUS_PILL: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const ORDER_PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  AWAITING_VERIFICATION: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

/* ── Main component ────────────────────────────────────────────────── */

export default function HardwareTab() {
  const [sub, setSub] = useState<SubTab>("catalog");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commission, setCommission] = useState<{ rows: CommissionRow[]; totals: { owed: number; settled: number } }>({
    rows: [],
    totals: { owed: 0, settled: 0 },
  });
  const [payout, setPayout] = useState<Payout>({ method: "esewa", label: "", identifier: "", instructions: "" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add/edit platform-listing modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Prompt modal state
  const [prompt, setPrompt] = useState<{
    open: boolean;
    title: string;
    label: string;
    placeholder?: string;
    numeric?: boolean;
    confirmLabel: string;
    onConfirm: (v: string) => void;
  }>({ open: false, title: "", label: "", confirmLabel: "", onConfirm: () => {} });

  const fetchAll = useCallback(async () => {
    try {
      const [p, o, c, pay] = await Promise.all([
        fetch("/api/admin/hardware", { cache: "no-store" }),
        fetch("/api/admin/hardware/orders", { cache: "no-store" }),
        fetch("/api/admin/hardware/commission", { cache: "no-store" }),
        fetch("/api/admin/hardware/payout", { cache: "no-store" }),
      ]);
      if (!p.ok) throw new Error();
      const pd = await p.json();
      setProducts(Array.isArray(pd.products) ? pd.products : []);
      if (o.ok) setOrders((await o.json()).orders ?? []);
      if (c.ok) {
        const cd = await c.json();
        setCommission({ rows: cd.rows ?? [], totals: cd.totals ?? { owed: 0, settled: 0 } });
      }
      if (pay.ok) setPayout((await pay.json()).payout);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── Catalog CRUD (platform listings) ── */
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const openEdit = (item: Product) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      type: item.type || "Terminal",
      price: String(item.price ?? ""),
      stock: String(item.stock ?? ""),
      imageUrl: item.imageUrl || "",
    });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim() || form.price === "" || form.stock === "") return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl.trim(),
      };
      const res = await fetch(
        editingId ? `/api/admin/hardware/${editingId}` : "/api/admin/hardware",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error();
      setShowModal(false);
      await fetchAll();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  /* ── Shared mutation helper ── */
  const mutate = async (url: string, method: string, body?: unknown) => {
    setBusyId(url);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error();
      await fetchAll();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (id: string, status: string, rejectionNote?: string) =>
    mutate(`/api/admin/hardware/${id}`, "PATCH", { status, rejectionNote });
  const deleteListing = (id: string) => mutate(`/api/admin/hardware/${id}`, "DELETE");
  const orderAction = (id: string, action: "confirm" | "cancel", note?: string) =>
    mutate(`/api/admin/hardware/orders/${id}`, "PATCH", { action, note });

  const settle = (listingId: string, amount: number, note?: string) =>
    mutate("/api/admin/hardware/commission/settle", "POST", { listingId, amount, note });

  const savePayout = async () => {
    setBusyId("payout");
    try {
      const res = await fetch("/api/admin/hardware/payout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payout),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  /* ── Derived lists ── */
  const catalog = products.filter(
    (p) => p.status === "APPROVED" || p.status === "ARCHIVED",
  );
  const pending = products.filter((p) => p.status === "PENDING_REVIEW");
  const filteredCatalog = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()),
  );

  const SUB_TABS: { id: SubTab; label: string; count?: number }[] = [
    { id: "catalog", label: "Catalog", count: catalog.length },
    { id: "review", label: "Pending review", count: pending.length },
    { id: "orders", label: "Orders", count: orders.length },
    { id: "commission", label: "Commission" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              sub === t.id
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                : "bg-white text-gray-500 hover:text-gray-900 border border-gray-100"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  sub === t.id ? "bg-white/20" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-3 text-sm font-semibold text-red-600">
          Something went wrong talking to the server. Please refresh.
        </div>
      )}

      {/* ── CATALOG ── */}
      {sub === "catalog" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Marketplace catalog</h3>
              <p className="text-sm font-medium text-gray-500 mt-0.5">
                {catalog.length} live listing{catalog.length === 1 ? "" : "s"} (platform + approved sellers)
              </p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={openAdd}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add product</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCatalog.map((item) => {
              const Icon = TYPE_ICON[item.type] || Cpu;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-16 w-16 rounded-[1.25rem] bg-gray-50 flex items-center justify-center text-[var(--accent)] overflow-hidden border-2 border-white">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Icon className="h-7 w-7" />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {item.isPlatformListing ? (
                        <span className="flex items-center gap-1 text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                          <BadgeCheck className="h-3 w-3" /> Platform
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${STATUS_PILL[item.status]}`}>
                          {item.status === "ARCHIVED" ? "Archived" : "Seller"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{item.name}</h3>
                    {!item.isPlatformListing && (
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        by {item.sellerName}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                      {item.description || "No description."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Price</p>
                      <p className="text-lg font-bold text-gray-900">{formatPrice(item.price, "NPR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Stock</p>
                      <p className="text-lg font-bold text-gray-900">{item.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Orders</p>
                      <p className="text-lg font-bold text-gray-900">{item.orderCount}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {item.isPlatformListing && (
                      <button
                        onClick={() => openEdit(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 text-xs font-bold transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    {item.status === "APPROVED" ? (
                      <button
                        onClick={() => setStatus(item.id, "ARCHIVED")}
                        disabled={busyId === `/api/admin/hardware/${item.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-600 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(item.id, "APPROVED")}
                        disabled={busyId === `/api/admin/hardware/${item.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Restore
                      </button>
                    )}
                    {item.orderCount === 0 && (
                      <button
                        onClick={() => deleteListing(item.id)}
                        disabled={busyId === `/api/admin/hardware/${item.id}`}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredCatalog.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Cpu className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-bold">
                  {search ? "No listings match your search." : "No live listings yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {sub === "review" && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 py-20 text-center">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">No submissions awaiting review.</p>
            </div>
          ) : (
            pending.map((item) => {
              const Icon = TYPE_ICON[item.type] || Cpu;
              const busy = busyId === `/api/admin/hardware/${item.id}`;
              return (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="h-24 w-24 shrink-0 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Icon className="h-9 w-9 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-3 line-clamp-2">{item.description}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Price</p>
                          <p className="font-bold text-gray-900">{formatPrice(item.price, "NPR")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Stock</p>
                          <p className="font-bold text-gray-900">{item.stock}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Seller</p>
                          <p className="font-bold text-gray-900 truncate">{item.sellerName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Contact</p>
                          <p className="font-bold text-gray-900">{item.sellerPhone}</p>
                          {item.sellerEmail && (
                            <p className="text-xs text-gray-500 truncate">{item.sellerEmail}</p>
                          )}
                        </div>
                      </div>
                      {item.sellerPayoutNote && (
                        <p className="mt-3 text-xs text-gray-500">
                          <span className="font-bold">Payout:</span> {item.sellerPayoutNote}
                        </p>
                      )}
                      {item.sellerPaymentQr && (
                        <a
                          href={item.sellerPaymentQr}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View payment QR
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
                    <button
                      onClick={() => setStatus(item.id, "APPROVED")}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        setPrompt({
                          open: true,
                          title: "Reject listing",
                          label: "Reason (shown to the seller)",
                          placeholder: "e.g. Image is unclear",
                          confirmLabel: "Reject",
                          onConfirm: (v) => {
                            setPrompt((p) => ({ ...p, open: false }));
                            setStatus(item.id, "REJECTED", v);
                          },
                        })
                      }
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-all"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ORDERS ── */}
      {sub === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 py-20 text-center">
              <Cpu className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">No hardware orders yet.</p>
            </div>
          ) : (
            orders.map((o) => {
              const busy = busyId === `/api/admin/hardware/orders/${o.id}`;
              return (
                <div key={o.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{o.listing?.name ?? "Hardware"}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${ORDER_PILL[o.status]}`}>
                          {o.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {o.listing?.isPlatformListing ? "Platform listing" : `Seller: ${o.listing?.sellerName}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">{formatPrice(o.total, "NPR")}</p>
                      {o.commissionAmount > 0 && (
                        <p className="text-[11px] font-bold text-[var(--accent)]">
                          5% = {formatPrice(o.commissionAmount, "NPR")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Buyer</p>
                      <p className="font-bold text-gray-900 truncate">{o.buyerName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Phone</p>
                      <p className="font-bold text-gray-900">{o.buyerPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Qty</p>
                      <p className="font-bold text-gray-900">{o.quantity}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Ship to</p>
                      <p className="font-bold text-gray-900 truncate">{o.shippingAddress ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                    {o.proofUrl ? (
                      <a
                        href={o.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" /> View payment proof
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">No proof uploaded yet</span>
                    )}
                    <div className="flex-1" />
                    {o.status !== "CONFIRMED" && o.status !== "CANCELLED" && (
                      <>
                        <button
                          onClick={() => orderAction(o.id, "confirm")}
                          disabled={busy}
                          className="flex items-center gap-2 px-5 h-10 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Confirm payment
                        </button>
                        <button
                          onClick={() =>
                            setPrompt({
                              open: true,
                              title: "Cancel order",
                              label: "Reason (optional)",
                              placeholder: "e.g. Buyer did not pay",
                              confirmLabel: "Cancel order",
                              onConfirm: (v) => {
                                setPrompt((p) => ({ ...p, open: false }));
                                orderAction(o.id, "cancel", v);
                              },
                            })
                          }
                          disabled={busy}
                          className="flex items-center gap-2 px-5 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-all"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── COMMISSION ── */}
      {sub === "commission" && (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Commission owed to you</p>
              <p className="text-3xl font-black text-gray-900">{formatPrice(commission.totals.owed, "NPR")}</p>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Settled to date</p>
              <p className="text-3xl font-black text-gray-900">{formatPrice(commission.totals.settled, "NPR")}</p>
            </div>
          </div>

          {/* Payout method */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-1">
              <Wallet className="h-5 w-5 text-[var(--accent)]" /> How sellers pay you
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-5">
              Shown to sellers so they know where to remit their 5% commission.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Method</label>
                <select
                  value={payout.method}
                  onChange={(e) => setPayout((p) => ({ ...p, method: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm cursor-pointer"
                >
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="bank">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Label</label>
                <input
                  value={payout.label}
                  onChange={(e) => setPayout((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. eSewa or NIC Asia Bank"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Identifier / account</label>
                <input
                  value={payout.identifier}
                  onChange={(e) => setPayout((p) => ({ ...p, identifier: e.target.value }))}
                  placeholder="Wallet ID or account number"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Instructions (optional)</label>
                <textarea
                  rows={2}
                  value={payout.instructions}
                  onChange={(e) => setPayout((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder="Anything else sellers should know"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm resize-none"
                />
              </div>
            </div>
            <button
              onClick={savePayout}
              disabled={busyId === "payout"}
              className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all"
            >
              {busyId === "payout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save payout method
            </button>
          </div>

          {/* Ledger */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Per-seller ledger</h3>
            {commission.rows.length === 0 ? (
              <p className="text-sm font-medium text-gray-400 py-6 text-center">
                No commission earned yet. It appears once a third-party order is confirmed.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {commission.rows.map((r) => (
                  <div key={r.listingId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {r.sellerName} · {r.sellerPhone} · {r.confirmedOrders} confirmed
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Owed</p>
                        <p className="font-black text-gray-900">{formatPrice(r.owed, "NPR")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Settled</p>
                        <p className="font-bold text-gray-500">{formatPrice(r.settled, "NPR")}</p>
                      </div>
                      <button
                        onClick={() =>
                          setPrompt({
                            open: true,
                            title: `Settle commission — ${r.name}`,
                            label: "Amount received (NPR)",
                            placeholder: String(r.owed),
                            numeric: true,
                            confirmLabel: "Record settlement",
                            onConfirm: (v) => {
                              const amt = Number(v);
                              if (!Number.isFinite(amt) || amt <= 0) return;
                              setPrompt((p) => ({ ...p, open: false }));
                              settle(r.listingId, amt);
                            },
                          })
                        }
                        disabled={r.owed <= 0}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
                      >
                        Mark settled
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit platform-listing modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setShowModal(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-2xl bg-white rounded-[2.5rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingId ? "Edit product" : "Add platform product"}
                </h3>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Platform listings are HimaVolt&apos;s own stock — auto-approved, no commission.
                </p>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <HardwareImageUpload
                  label="Product photo"
                  hint="JPEG, PNG or WebP · up to 5MB"
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                />

                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Product name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Thermal Receipt Printer"
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Description</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Detailed product specifications…"
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Category</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold cursor-pointer"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Price (NPR)</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="45000"
                        className="w-full pl-11 pr-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Stock available</label>
                    <input
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      placeholder="10"
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-7 py-3.5 rounded-2xl font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || form.price === "" || form.stock === ""}
                  className="px-7 py-3.5 rounded-2xl font-bold bg-[var(--accent)] text-white shadow-xl shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save changes" : "Add to catalog"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Prompt modal ── */}
      <AnimatePresence>
        {prompt.open && (
          <PromptModal
            open={prompt.open}
            title={prompt.title}
            label={prompt.label}
            placeholder={prompt.placeholder}
            numeric={prompt.numeric}
            confirmLabel={prompt.confirmLabel}
            onCancel={() => setPrompt((p) => ({ ...p, open: false }))}
            onConfirm={prompt.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
