"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Tag,
  Check,
  X,
  Copy,
  Percent,
  DollarSign,
  Calendar,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

type CouponFormData = {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_FORM: CouponFormData = {
  code: "",
  type: "PERCENTAGE",
  value: 0,
  minOrder: "",
  maxDiscount: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CouponManagementTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ── Fetch ─────────────────────────────────────────────────────── */

  const fetchCoupons = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<Coupon[] | { coupons: Coupon[] }>(
        `/api/restaurants/${restaurant.id}/coupons`,
      );
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.coupons)
          ? data.coupons
          : [];
      setCoupons(list);
    } catch {
      showToast("Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  /* ── Helpers ───────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder != null ? String(coupon.minOrder) : "",
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
      startsAt: coupon.startsAt
        ? coupon.startsAt.slice(0, 16)
        : "",
      expiresAt: coupon.expiresAt
        ? coupon.expiresAt.slice(0, 16)
        : "",
      isActive: coupon.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
  };

  const updateField = <K extends keyof CouponFormData>(
    key: K,
    value: CouponFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ── Submit (create / update) ──────────────────────────────────── */

  const handleSubmit = async () => {
    if (!restaurant) return;
    const code = form.code.trim().toUpperCase();
    if (!code || form.value <= 0) {
      showToast("Code and value are required", "error");
      return;
    }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      code,
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder ? Number(form.minOrder) : null,
      maxDiscount:
        form.type === "PERCENTAGE" && form.maxDiscount
          ? Number(form.maxDiscount)
          : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : null,
      isActive: form.isActive,
    };

    try {
      if (editingCoupon) {
        // Update
        const updated = await apiFetch<Coupon>(
          `/api/restaurants/${restaurant.id}/coupons/${editingCoupon.id}`,
          { method: "PATCH", body: payload },
        );
        setCoupons((prev) =>
          prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...updated } : c)),
        );
        showToast("Coupon updated");
      } else {
        // Create
        const created = await apiFetch<Coupon>(
          `/api/restaurants/${restaurant.id}/coupons`,
          { method: "POST", body: payload },
        );
        setCoupons((prev) => [created, ...prev]);
        showToast("Coupon created");
      }
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save coupon",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────────────── */

  const handleDelete = async (id: string) => {
    if (!restaurant) return;
    setDeletingId(id);
    // Optimistic removal
    const prev = coupons;
    setCoupons((c) => c.filter((x) => x.id !== id));
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/coupons/${id}`, {
        method: "DELETE",
      });
      showToast("Coupon deleted");
    } catch {
      setCoupons(prev); // rollback
      showToast("Failed to delete coupon", "error");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Copy code ─────────────────────────────────────────────────── */

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  /* ── Guard ─────────────────────────────────────────────────────── */

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-amber-400">
        <Tag className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium text-amber-600">
          Select a restaurant first
        </p>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-950">Coupon Management</h2>
          <p className="text-sm text-amber-700/50">
            Create and manage discount coupons for your customers.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      {/* Stats row */}
      {coupons.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: coupons.length,
              color: "text-amber-900",
            },
            {
              label: "Active",
              value: coupons.filter((c) => c.isActive).length,
              color: "text-emerald-600",
            },
            {
              label: "Inactive",
              value: coupons.filter((c) => !c.isActive).length,
              color: "text-gray-500",
            },
            {
              label: "Total Uses",
              value: coupons.reduce((sum, c) => sum + c.usedCount, 0),
              color: "text-blue-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white ring-1 ring-amber-100/60 p-4"
            >
              <p className="text-xs font-semibold text-amber-600/60">
                {stat.label}
              </p>
              <p className={`text-2xl font-black ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Coupon list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-amber-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 mb-4">
            <Tag className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-amber-700">No coupons yet</p>
          <p className="text-xs text-amber-500 mt-1">
            Create your first coupon to offer discounts to customers
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {coupons.map((coupon, i) => (
              <motion.div
                key={coupon.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={`group rounded-2xl bg-white ring-1 p-4 transition-all hover:shadow-md ${
                  coupon.isActive
                    ? "ring-amber-100/60"
                    : "ring-gray-100 opacity-70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code badge + copy */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100/60">
                      <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="font-mono text-sm font-black text-amber-900 tracking-wider">
                        {coupon.code}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(coupon.code, coupon.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedId === coupon.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Discount info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {coupon.type === "PERCENTAGE" ? (
                        <Percent className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      <span className="text-sm font-bold text-amber-950">
                        {coupon.value}
                        {coupon.type === "PERCENTAGE" ? "% off" : " flat off"}
                      </span>
                    </div>

                    {coupon.minOrder != null && coupon.minOrder > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600/60 bg-amber-50/60 rounded-md px-1.5 py-0.5">
                        Min: {coupon.minOrder}
                      </span>
                    )}

                    {coupon.type === "PERCENTAGE" &&
                      coupon.maxDiscount != null &&
                      coupon.maxDiscount > 0 && (
                        <span className="text-[10px] font-semibold text-amber-600/60 bg-amber-50/60 rounded-md px-1.5 py-0.5">
                          Max: {coupon.maxDiscount}
                        </span>
                      )}

                    {/* Usage */}
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600/60">
                      <Users className="h-3 w-3" />
                      <span>
                        {coupon.usedCount}
                        {coupon.maxUses != null
                          ? ` / ${coupon.maxUses}`
                          : " uses"}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        coupon.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-gray-50 text-gray-500 ring-1 ring-gray-100"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="hidden lg:flex items-center gap-3 text-[10px] text-amber-500 shrink-0">
                    {coupon.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires{" "}
                        {new Date(coupon.expiresAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(coupon)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                      title="Edit coupon"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      disabled={deletingId === coupon.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete coupon"
                    >
                      {deletingId === coupon.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="fixed inset-0 z-100 bg-amber-950/30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90dvh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100/60">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-bold text-amber-950">
                    {editingCoupon ? "Edit Coupon" : "New Coupon"}
                  </h3>
                </div>
                <button
                  onClick={closeForm}
                  className="rounded-full p-2 text-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Code */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      updateField("code", e.target.value.toUpperCase())
                    }
                    placeholder="e.g. WELCOME20"
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm font-mono font-bold text-amber-950 placeholder-amber-400 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Discount Type
                  </label>
                  <div className="flex gap-2">
                    {(
                      [
                        { label: "Percentage", value: "PERCENTAGE" as const },
                        { label: "Flat Amount", value: "FLAT" as const },
                      ] as const
                    ).map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => updateField("type", value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                          form.type === value
                            ? "bg-amber-600 text-white"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {value === "PERCENTAGE" ? (
                          <Percent className="h-3.5 w-3.5" />
                        ) : (
                          <DollarSign className="h-3.5 w-3.5" />
                        )}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    {form.type === "PERCENTAGE"
                      ? "Discount Percentage"
                      : "Discount Amount"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.type === "PERCENTAGE" ? 100 : undefined}
                    value={form.value || ""}
                    onChange={(e) =>
                      updateField("value", Number(e.target.value))
                    }
                    placeholder={
                      form.type === "PERCENTAGE" ? "e.g. 20" : "e.g. 100"
                    }
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Min Order */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Minimum Order{" "}
                    <span className="text-amber-400 normal-case font-medium">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrder}
                    onChange={(e) => updateField("minOrder", e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Max Discount (only for PERCENTAGE) */}
                {form.type === "PERCENTAGE" && (
                  <div>
                    <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                      Max Discount{" "}
                      <span className="text-amber-400 normal-case font-medium">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxDiscount}
                      onChange={(e) =>
                        updateField("maxDiscount", e.target.value)
                      }
                      placeholder="e.g. 200"
                      className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    />
                  </div>
                )}

                {/* Max Uses */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Max Uses{" "}
                    <span className="text-amber-400 normal-case font-medium">
                      (optional, blank = unlimited)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxUses}
                    onChange={(e) => updateField("maxUses", e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                      Starts At
                    </label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => updateField("startsAt", e.target.value)}
                      className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-3 py-2.5 text-sm text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                      Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => updateField("expiresAt", e.target.value)}
                      className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-3 py-2.5 text-sm text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-xl bg-amber-50/40 px-4 py-3 ring-1 ring-amber-100/40">
                  <span className="text-sm font-bold text-amber-900">
                    Active
                  </span>
                  <button
                    onClick={() => updateField("isActive", !form.isActive)}
                    className="cursor-pointer"
                  >
                    {form.isActive ? (
                      <ToggleRight className="h-7 w-7 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={
                    !form.code.trim() || form.value <= 0 || submitting
                  }
                  className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingCoupon ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {submitting
                    ? "Saving..."
                    : editingCoupon
                      ? "Update Coupon"
                      : "Create Coupon"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
