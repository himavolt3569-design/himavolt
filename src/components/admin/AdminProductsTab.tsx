"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Store,
  BedDouble,
  Cpu,
  Plus,
  Loader2,
  ChevronRight,
  ImagePlus,
  X,
  Check,
  UtensilsCrossed,
  FolderPlus,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface BusinessLite {
  id: string;
  name: string;
  slug?: string;
  type: string;
  city?: string;
}

interface Category {
  id: string;
  name: string;
  children?: Category[];
  _count?: { items: number };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
}

interface Room {
  id: string;
  roomNumber: string;
  name: string | null;
  type: string;
  price: number;
  maxGuests: number;
}

/* ── Image upload (reuses /api/upload, which accepts the master-admin JWT) ── */

function ImageField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder,
        }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(signData.error ?? "Upload failed.");
        return;
      }
      const putRes = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setError("Upload failed. Please try again.");
        return;
      }
      onChange(signData.publicUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-3)] hover:border-[var(--accent)]"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[10px] font-semibold">{uploading ? "Uploading" : "Photo"}</span>
        </button>
      )}
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

/* ── Business picker ───────────────────────────────────────────────── */

function BusinessPicker({ onSelect }: { onSelect: (b: BusinessLite) => void }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BusinessLite[]>([]);
  const [loading, setLoading] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/restaurants?${params}`, { cache: "no-store" });
      const data = await res.json();
      setResults(
        (data.restaurants ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          slug: r.slug as string,
          type: r.type as string,
          city: r.city as string,
        })),
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch("");
  }, [runSearch]);

  const onChange = (val: string) => {
    setInput(val);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => runSearch(val), 400);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search a restaurant or hotel to manage…"
          className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] py-3 pl-11 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-left hover:border-[var(--border)] hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--text-3)]">
                {b.type === "HOTEL" ? <BedDouble className="h-5 w-5" /> : <Store className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--text-1)]">{b.name}</p>
                <p className="text-xs font-medium text-[var(--text-3)]">
                  {b.type} · {b.city}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-3)]" />
            </button>
          ))}
          {results.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-[var(--text-3)]">No businesses found.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Menu manager ──────────────────────────────────────────────────── */

function flattenCategories(cats: Category[]): Category[] {
  const out: Category[] = [];
  for (const c of cats) {
    out.push(c);
    if (c.children?.length) out.push(...c.children);
  }
  return out;
}

function MenuManager({ business }: { business: BusinessLite }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    categoryId: "",
    imageUrl: "",
    isVeg: false,
    isDrink: false,
  });

  const flat = flattenCategories(categories);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetch(`/api/restaurants/${business.id}/categories`, { cache: "no-store" }),
        fetch(`/api/restaurants/${business.id}/menu`, { cache: "no-store" }),
      ]);
      const cats = cRes.ok ? await cRes.json() : [];
      const menu = iRes.ok ? await iRes.json() : [];
      setCategories(Array.isArray(cats) ? cats : []);
      setItems(Array.isArray(menu) ? menu : []);
    } catch {
      setCategories([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [business.id]);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${business.id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim() }),
      });
      if (res.ok) {
        setCatName("");
        setShowCatForm(false);
        await load();
      }
    } finally {
      setSavingCat(false);
    }
  };

  const addItem = async () => {
    setError("");
    const price = Number(form.price);
    if (!form.name.trim()) return setError("Name is required");
    if (!Number.isFinite(price) || price <= 0) return setError("Enter a valid price");
    if (!form.categoryId) return setError("Choose a category");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${business.id}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          price,
          description: form.description.trim() || undefined,
          categoryId: form.categoryId,
          imageUrl: form.imageUrl || undefined,
          isVeg: form.isVeg,
          isDrink: form.isDrink,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not add item");
        return;
      }
      setForm({ name: "", price: "", description: "", categoryId: "", imageUrl: "", isVeg: false, isDrink: false });
      setShowItemForm(false);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowCatForm((s) => !s)}
          className="flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
        >
          <FolderPlus className="h-4 w-4" /> New category
        </button>
        <button
          onClick={() => {
            setShowItemForm((s) => !s);
            setForm((f) => ({ ...f, categoryId: f.categoryId || flat[0]?.id || "" }));
          }}
          disabled={flat.length === 0}
          className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New menu item
        </button>
        {flat.length === 0 && (
          <span className="flex items-center text-xs font-medium text-[var(--text-3)]">
            Add a category first.
          </span>
        )}
      </div>

      {/* Category form */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-3">
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name, e.g. Momos"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                onClick={addCategory}
                disabled={savingCat || !catName.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {savingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item form */}
      <AnimatePresence>
        {showItemForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <ImageField value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} folder="menu" />
                <div className="flex-1 space-y-3 min-w-0">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Item name"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") }))}
                      placeholder="Price"
                      inputMode="decimal"
                      className="w-full sm:w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none shrink-0"
                    />
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                      className="w-full flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none min-w-0"
                    >
                      {flat.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-2)]">
                  <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm((f) => ({ ...f, isVeg: e.target.checked }))} className="h-4 w-4 accent-[var(--accent)]" />
                  Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-2)]">
                  <input type="checkbox" checked={form.isDrink} onChange={(e) => setForm((f) => ({ ...f, isDrink: e.target.checked }))} className="h-4 w-4 accent-[var(--accent)]" />
                  Drink
                </label>
              </div>
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addItem}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add item
                </button>
                <button
                  onClick={() => { setShowItemForm(false); setError(""); }}
                  className="rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing menu */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">
          Current menu ({items.length} item{items.length !== 1 ? "s" : ""})
        </p>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
            <UtensilsCrossed className="mx-auto mb-2 h-6 w-6 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No items yet. Add the first one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-alt)]">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-3)]">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-1)]">{it.name}</p>
                <span className="text-sm font-bold text-[var(--text-1)] shrink-0">{formatPrice(it.price, "NPR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Rooms manager ─────────────────────────────────────────────────── */

const ROOM_TYPES = ["STANDARD", "DELUXE", "SUITE", "DORMITORY", "FAMILY"];

function RoomsManager({ business }: { business: BusinessLite }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    roomNumber: "",
    name: "",
    type: "STANDARD",
    price: "",
    maxGuests: "2",
    bedCount: "1",
    imageUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${business.id}/rooms`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [business.id]);

  useEffect(() => {
    load();
  }, [load]);

  const addRoom = async () => {
    setError("");
    if (!form.roomNumber.trim()) return setError("Room number is required");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${business.id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: form.roomNumber.trim(),
          name: form.name.trim() || undefined,
          type: form.type,
          price: Number(form.price) || 0,
          maxGuests: Number(form.maxGuests) || 2,
          bedCount: Number(form.bedCount) || 1,
          imageUrls: form.imageUrl ? [form.imageUrl] : [],
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not add room");
        return;
      }
      setForm({ roomNumber: "", name: "", type: "STANDARD", price: "", maxGuests: "2", bedCount: "1", imageUrl: "" });
      setShowForm(false);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"
      >
        <Plus className="h-4 w-4" /> New room
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <ImageField value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} folder="rooms" />
                <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <input
                    value={form.roomNumber}
                    onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                    placeholder="Room number *"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name (optional)"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") }))}
                    placeholder="Price / night"
                    inputMode="decimal"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    value={form.maxGuests}
                    onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="Max guests"
                    inputMode="numeric"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    value={form.bedCount}
                    onChange={(e) => setForm((f) => ({ ...f, bedCount: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="Beds"
                    inputMode="numeric"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addRoom}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add room
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">
          Current rooms ({rooms.length})
        </p>
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
            <BedDouble className="mx-auto mb-2 h-6 w-6 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No rooms yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-start sm:items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--text-3)]">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--text-1)]">
                    {r.roomNumber}{r.name ? ` · ${r.name}` : ""}
                  </p>
                  <p className="truncate text-xs font-medium text-[var(--text-3)]">
                    {r.type} · up to {r.maxGuests}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--text-1)] shrink-0 mt-1 sm:mt-0">{formatPrice(r.price, "NPR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Hardware Manager ──────────────────────────────────────────────── */

interface HardwareItem {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
  sellerName: string;
}

function HardwareManager({ business }: { business: BusinessLite }) {
  const [items, setItems] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "Terminal",
    price: "",
    stock: "",
    imageUrl: "",
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hardware", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.products?.filter((p: HardwareItem) => p.sellerName === business.name) || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [business.name]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async () => {
    if (!form.name.trim() || !form.price || !form.stock) {
      setError("Name, price, and stock are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          price: Number(form.price),
          stock: Number(form.stock),
          imageUrl: form.imageUrl,
          sellerName: business.name,
          sellerPhone: "Admin Override",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add item");
      }
      setForm({ name: "", description: "", type: "Terminal", price: "", stock: "", imageUrl: "" });
      setShowForm(false);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#eaa94d] px-4 py-3 text-sm font-bold text-white hover:bg-[#d9963a] sm:flex-none"
        >
          <Plus className="h-4 w-4" /> New hardware listing
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <ImageField value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} folder="hardware" />
                <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Hardware name"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="Terminal">Terminal</option>
                    <option value="Screen">Screen</option>
                    <option value="Printer">Printer</option>
                    <option value="Accessory">Accessory</option>
                  </select>
                  <input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") }))}
                    placeholder="Price"
                    inputMode="decimal"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="Stock count"
                    inputMode="numeric"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
              />
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addItem}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add listing
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">
          Current hardware ({items.length})
        </p>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
            <Cpu className="mx-auto mb-2 h-6 w-6 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No hardware listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-start sm:items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-3)]">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Cpu className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--text-1)]">
                    {it.name}
                  </p>
                  <p className="truncate text-xs font-medium text-[var(--text-3)]">
                    {it.type} · Stock: {it.stock}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--text-1)] shrink-0 mt-1 sm:mt-0">{formatPrice(it.price, "NPR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────── */

export default function AdminProductsTab({
  preselect,
}: {
  preselect?: BusinessLite | null;
}) {
  const [business, setBusiness] = useState<BusinessLite | null>(preselect ?? null);
  const [view, setView] = useState<"menu" | "rooms" | "hardware">("menu");
  const [prevPreselect, setPrevPreselect] = useState<BusinessLite | null | undefined>(preselect);

  // Adopt a preselected business (from the user drawer's "Add product")
  // using a render-phase update to avoid cascading renders.
  if (preselect !== prevPreselect) {
    setPrevPreselect(preselect);
    if (preselect) {
      setBusiness(preselect);
      setView("menu");
    }
  }

  if (!business) {
    return (
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <h3 className="text-lg font-bold text-[var(--text-1)]">Add products on behalf of a business</h3>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Pick any restaurant or hotel, then add menu items, hotel rooms, or manage hardware.
          </p>
        </div>
        <BusinessPicker onSelect={setBusiness} />
      </div>
    );
  }

  const isHotel = business.type === "HOTEL";

  return (
    <div className="space-y-5">
      {/* Selected business header */}
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            {isHotel ? <BedDouble className="h-6 w-6" /> : <Store className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-base font-bold text-[var(--text-1)]">{business.name}</p>
            <p className="text-xs font-medium text-[var(--text-3)]">{business.type}{business.city ? ` · ${business.city}` : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setBusiness(null)}
          className="self-start rounded-2xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] sm:self-auto"
        >
          Change business
        </button>
      </div>

      {/* View switch */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setView("menu")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
            view === "menu" ? "bg-[var(--text-1)] text-[var(--canvas)]" : "bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" /> Menu items
        </button>
        {isHotel && (
          <button
            onClick={() => setView("rooms")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
              view === "rooms" ? "bg-[var(--text-1)] text-[var(--canvas)]" : "bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            <BedDouble className="h-4 w-4" /> Rooms
          </button>
        )}
        <button
          onClick={() => setView("hardware")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
            view === "hardware" ? "bg-[var(--text-1)] text-[var(--canvas)]" : "bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
          }`}
        >
          <Cpu className="h-4 w-4" /> Hardware listings
        </button>
      </div>

      {view === "menu" && <MenuManager key={`menu-${business.id}`} business={business} />}
      {view === "rooms" && <RoomsManager key={`rooms-${business.id}`} business={business} />}
      {view === "hardware" && <HardwareManager key={`hard-${business.id}`} business={business} />}
    </div>
  );
}
