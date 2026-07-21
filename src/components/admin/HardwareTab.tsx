"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Tag,
  Loader2,
  Cpu,
  Printer,
  MonitorSmartphone,
  Laptop,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface HardwareProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
}

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

export default function HardwareTab() {
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hardware", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: HardwareProduct) => {
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
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl.trim(),
      };
      const res = await fetch("/api/admin/hardware", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setShowModal(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/hardware?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setError(true);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-100 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Action bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Hardware inventory</h3>
          <p className="text-sm font-medium text-gray-500 mt-0.5">
            {products.length} product{products.length === 1 ? "" : "s"} in the catalog
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
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

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-3 text-sm font-semibold text-red-600">
          Something went wrong talking to the server. Please try again.
        </div>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.type] || Cpu;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-20 w-20 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-[var(--accent)] shadow-inner overflow-hidden border-2 border-white">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-50"
                      aria-label={`Delete ${item.name}`}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                    {item.type}
                  </span>
                  <h3 className="font-bold text-gray-900 text-xl leading-tight mt-3 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                    {item.description || "No description."}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(item.price, "NPR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Stock</p>
                    <div className="flex items-center justify-end gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.stock > 10 ? "bg-emerald-500" : item.stock > 0 ? "bg-orange-500" : "bg-red-500"}`} />
                      <p className="text-lg font-bold text-gray-900">{item.stock} units</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Cpu className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">
              {search ? "No hardware matches your search." : "No hardware yet. Add your first product to get started."}
            </p>
          </div>
        )}
      </div>

      {/* ── Add / Edit modal ── */}
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
                  {editingId ? "Edit product" : "Add hardware product"}
                </h3>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Saved to the platform catalog, visible to every admin.
                </p>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Image URL + preview */}
                <div className="flex items-center gap-5">
                  <div className="h-24 w-24 shrink-0 rounded-[1.5rem] bg-gray-50 border-2 border-white shadow-inner flex items-center justify-center overflow-hidden text-gray-300">
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Image URL</label>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://…/product.jpg"
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold text-sm"
                    />
                  </div>
                </div>

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
    </div>
  );
}
