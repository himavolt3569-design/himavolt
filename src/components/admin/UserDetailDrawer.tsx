"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  AtSign,
  Calendar,
  Clock,
  Shield,
  Store,
  ShoppingBag,
  Star,
  Award,
  Ban,
  ShieldCheck,
  Pencil,
  Check,
  Loader2,
  Trash2,
  PlusCircle,
  KeyRound,
  UserCog,
  ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Detail {
  user: {
    id: string;
    email: string;
    name: string;
    username: string | null;
    phone: string | null;
    imageUrl: string | null;
    role: string;
    hasPassword: boolean;
    isBlacklisted: boolean;
    isDeleted: boolean;
    pending: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    counts: {
      orders: number;
      ownedRestaurants: number;
      reviews: number;
      favourites: number;
      staffMemberships: number;
      loyaltyAccounts: number;
    };
  };
  auth: {
    lastSignInAt: string | null;
    emailConfirmed: boolean;
    providers: string[];
    createdAt: string | null;
  } | null;
  recentOrders: {
    id: string;
    orderNo: string;
    total: number;
    status: string;
    type: string;
    createdAt: string;
    restaurant: { name: string } | null;
  }[];
  ownedRestaurants: {
    id: string;
    name: string;
    slug: string;
    type: string;
    city: string;
    isActive: boolean;
  }[];
  staffMemberships: {
    id: string;
    role: string;
    isActive: boolean;
    restaurant: { id: string; name: string } | null;
  }[];
  loyalty: { points: number; totalSpent: number };
}

const ROLES = ["CUSTOMER", "OWNER", "ADMIN"] as const;

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ── Small building blocks ─────────────────────────────────────────── */

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-3)]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{label}</p>
        <p className="truncate text-sm font-semibold text-[var(--text-1)]">{value}</p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-[var(--text-3)]" />
      <p className="text-lg font-bold text-[var(--text-1)] tabular-nums">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">{label}</p>
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────── */

export default function UserDetailDrawer({
  userId,
  open,
  onClose,
  onChanged,
  onDeleted,
  onAddProduct,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onDeleted?: (userId: string) => void;
  onAddProduct?: (business: {
    id: string;
    name: string;
    slug: string;
    type: string;
    city: string;
  }) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", username: "" });
  const [formError, setFormError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    setEditing(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as Detail;
      setDetail(data);
      setForm({
        name: data.user.name ?? "",
        phone: data.user.phone ?? "",
        username: data.user.username ?? "",
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) load();
    if (!open) {
      setDetail(null);
      setEditing(false);
      setFormError("");
    }
  }, [open, userId, load]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    if (!userId) return false;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error || "Could not save changes");
        return false;
      }
      await load();
      onChanged?.();
      return true;
    } catch {
      setFormError("Network error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    const ok = await patch({ name: form.name, phone: form.phone, username: form.username || null });
    if (ok) setEditing(false);
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        onDeleted?.(userId);
        onClose();
      }
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const u = detail?.user;
  const blocked = !!u?.isBlacklisted;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="relative flex h-full w-full max-w-lg flex-col bg-[var(--surface)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
              <h2 className="text-base font-bold text-[var(--text-1)]">User details</h2>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-[var(--text-3)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-1)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--text-3)]" />
                </div>
              ) : error || !u ? (
                <div className="py-24 text-center">
                  <p className="text-sm font-semibold text-[var(--text-2)]">Could not load this user</p>
                  <button
                    onClick={load}
                    className="mt-3 rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Identity */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface-alt)]">
                      {u.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold uppercase text-[var(--text-3)]">
                          {u.name?.slice(0, 2) || "U"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-[var(--text-1)]">{u.name || "Unnamed"}</h3>
                        <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-2)]">
                          {u.role}
                        </span>
                        {blocked && (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                            Blocked
                          </span>
                        )}
                        {u.pending && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-[var(--text-3)]">{u.email || "No email"}</p>
                    </div>
                  </div>

                  {/* Activity stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <Stat icon={ShoppingBag} label="Orders" value={u.counts.orders} />
                    <Stat icon={Store} label="Owns" value={u.counts.ownedRestaurants} />
                    <Stat icon={Star} label="Reviews" value={u.counts.reviews} />
                    <Stat icon={Award} label="Points" value={detail!.loyalty.points} />
                  </div>

                  {/* Contact + account */}
                  <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">Profile</h4>
                      {!u.pending && !editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">Name</label>
                          <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">Phone</label>
                          <input
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="+977 ..."
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">Username</label>
                          <input
                            value={form.username}
                            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                            placeholder="username"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        {formError && <p className="text-xs font-medium text-rose-600">{formError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditing(false); setFormError(""); }}
                            className="rounded-xl bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoRow icon={Mail} label="Email" value={u.email || "—"} />
                        <InfoRow icon={Phone} label="Phone" value={u.phone || "Not set"} />
                        <InfoRow icon={AtSign} label="Username" value={u.username || "—"} />
                        <InfoRow icon={KeyRound} label="Password" value={u.hasPassword ? "Set" : "Not set (OAuth)"} />
                        <InfoRow icon={Calendar} label="Joined" value={fmtDate(u.createdAt)} />
                        <InfoRow icon={Clock} label="Last sign-in" value={fmtDateTime(detail!.auth?.lastSignInAt ?? null)} />
                        <InfoRow
                          icon={ShieldCheck}
                          label="Sign-in via"
                          value={detail!.auth?.providers?.length ? detail!.auth.providers.join(", ") : "Email"}
                        />
                        <InfoRow icon={Award} label="Loyalty spent" value={formatPrice(detail!.loyalty.totalSpent, "NPR")} />
                      </div>
                    )}
                  </div>

                  {/* Owned restaurants */}
                  {detail!.ownedRestaurants.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">
                        Owns {detail!.ownedRestaurants.length} business{detail!.ownedRestaurants.length > 1 ? "es" : ""}
                      </h4>
                      <div className="space-y-2">
                        {detail!.ownedRestaurants.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--text-3)]">
                              <Store className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-[var(--text-1)]">{r.name}</p>
                              <p className="text-xs font-medium text-[var(--text-3)]">
                                {r.type} · {r.city} · {r.isActive ? "Active" : "Inactive"}
                              </p>
                            </div>
                            {onAddProduct && (
                              <button
                                onClick={() => onAddProduct(r)}
                                className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent)]/10 px-2.5 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/20"
                              >
                                <PlusCircle className="h-3.5 w-3.5" /> Add product
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff memberships */}
                  {detail!.staffMemberships.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">Works as staff at</h4>
                      <div className="space-y-2">
                        {detail!.staffMemberships.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                            <UserCog className="h-4 w-4 text-[var(--text-3)]" />
                            <span className="text-sm font-semibold text-[var(--text-1)]">{s.restaurant?.name ?? "—"}</span>
                            <span className="ml-auto rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-3)]">{s.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent orders */}
                  {detail!.recentOrders.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">Recent orders</h4>
                      <div className="space-y-1.5">
                        {detail!.recentOrders.map((o) => (
                          <div key={o.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] px-3 py-2">
                            <span className="font-mono text-xs text-[var(--text-3)]">#{o.orderNo}</span>
                            <span className="truncate text-xs font-medium text-[var(--text-2)]">{o.restaurant?.name ?? "—"}</span>
                            <span className="ml-auto text-xs font-bold text-[var(--text-1)]">{formatPrice(o.total, "NPR")}</span>
                            <span className="rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--text-3)]">{o.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Role + danger */}
                  {!u.pending && (
                    <div className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-3)]">
                          <Shield className="h-3.5 w-3.5" /> Change role
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {ROLES.map((r) => (
                            <button
                              key={r}
                              onClick={() => u.role !== r && patch({ role: r })}
                              disabled={saving || u.role === r}
                              className={`rounded-xl py-2 text-xs font-bold transition-all disabled:cursor-not-allowed ${
                                u.role === r
                                  ? "bg-[var(--text-1)] text-[var(--canvas)]"
                                  : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface)] disabled:opacity-50"
                              }`}
                            >
                              {r === "CUSTOMER" ? "Customer" : r === "OWNER" ? "Owner" : "Admin"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => patch({ isBlacklisted: !blocked })}
                          disabled={saving}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                            blocked
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          }`}
                        >
                          {blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          {blocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => setDeleteOpen(true)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
                        <ExternalLink className="h-3 w-3" /> Blocking immediately signs the user out and locks them out.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          <DeleteConfirmDialog
            open={deleteOpen}
            title={`Delete "${u?.name || u?.email}"?`}
            description="This permanently removes the user profile and all of their associated data. This cannot be undone."
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
