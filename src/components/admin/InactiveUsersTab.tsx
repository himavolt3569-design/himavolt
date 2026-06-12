"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserX,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Mail,
  Phone,
  Calendar,
  Clock,
  Trash2,
  UserCheck,
  ShoppingBag,
  Star,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface InactiveUser {
  id: string;
  email: string;
  name: string;
  username: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastOrderAt: string | null;
  _count: { orders: number; reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  OWNER: "bg-purple-100 text-purple-700",
};

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function InactiveUsersTab() {
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InactiveUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  const fetchUsers = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/inactive-users?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, search],
  );

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => !selectedIds.has(u.id)));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - selectedIds.size } : p);
        setSelectedIds(new Set());
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    setReactivating(userId);
    try {
      const res = await fetch("/api/admin/inactive-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        // Remove from inactive list since they're now considered active
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      }
    } catch {
      // silent
    } finally {
      setReactivating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
        <div className="text-xs text-[var(--accent-text)]">
          <span className="font-semibold">Inactive accounts</span>: users who joined more than 15 days ago and have
          placed no orders in the last 15 days. Admin accounts are excluded.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2 pl-9 pr-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--accent)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => fetchUsers(page)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-[var(--text-3)]">
            {pagination.total.toLocaleString()} inactive account{pagination.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-400 hover:text-red-600">Clear</button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--accent-muted)] px-4 py-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelectedIds(allSelected ? new Set() : new Set(users.map((u) => u.id)))}
            className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
          />
          <UserX className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text-2)]">Inactive Accounts (15+ days)</span>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="mx-auto mb-2 h-8 w-8 text-[var(--accent-hover)]" />
            <p className="text-sm font-medium text-[var(--text-2)]">No inactive accounts found</p>
            <p className="mt-0.5 text-xs text-[var(--text-3)]">All users have been active in the last 15 days</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {users.map((user) => {
              const isExpanded = expandedId === user.id;
              const inactiveDays = daysSince(user.lastOrderAt ?? user.createdAt);
              const isReactivating = reactivating === user.id;
              const isSelected = selectedIds.has(user.id);

              return (
                <div key={user.id} className={`transition-all hover:bg-[var(--accent-muted)] ${isSelected ? "bg-red-50/30" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 flex-shrink-0 rounded accent-[var(--accent)]"
                    />
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] overflow-hidden">
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt={user.name} className="h-10 w-10 object-cover rounded-full" />
                      ) : (
                        <UserX className="h-5 w-5 text-[var(--accent)]" />
                      )}
                    </div>

                    {/* Name & email */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-1)] truncate">{user.name || "Unnamed"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[user.role] || "bg-[var(--surface)] text-[var(--text-2)]"}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-2)] truncate">{user.email}</p>
                    </div>

                    <div className="hidden flex-shrink-0 sm:flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
                        <Clock className="h-3 w-3" />
                        {inactiveDays != null ? `${inactiveDays}d inactive` : "New"}
                      </span>
                    </div>

                    <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--accent-muted)] bg-[var(--accent-muted)] px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div className="min-w-0">
                                <span className="block text-[var(--text-3)]">Email</span>
                                <p className="truncate font-medium text-[var(--text-1)]">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div>
                                <span className="block text-[var(--text-3)]">Phone</span>
                                <p className="font-medium text-[var(--text-1)]">{user.phone || "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div>
                                <span className="block text-[var(--text-3)]">Joined</span>
                                <p className="font-medium text-[var(--text-1)]">{formatDate(user.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div>
                                <span className="block text-[var(--text-3)]">Last Order</span>
                                <p className="font-medium text-[var(--text-1)]">{formatDate(user.lastOrderAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div>
                                <span className="block text-[var(--text-3)]">Total Orders</span>
                                <p className="font-bold text-[var(--text-1)]">{user._count.orders}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-3)]" />
                              <div>
                                <span className="block text-[var(--text-3)]">Reviews</span>
                                <p className="font-medium text-[var(--text-1)]">{user._count.reviews}</p>
                              </div>
                            </div>
                          </div>

                          {/* Username & ID */}
                          <div className="grid grid-cols-2 gap-x-6 text-xs">
                            <div>
                              <span className="text-[var(--text-3)]">Username</span>
                              <p className="font-medium text-[var(--text-1)]">{user.username || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">User ID</span>
                              <p className="font-mono text-[11px] text-[var(--text-1)] truncate">{user.id}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => handleReactivate(user.id)}
                              disabled={isReactivating}
                              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-medium text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all disabled:opacity-50"
                            >
                              {isReactivating ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent-border)] border-t-green-500" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              {isReactivating ? "Reactivating..." : "Reactivate"}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5">
            <span className="text-xs text-[var(--text-3)]">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-2)] hover:bg-[var(--accent-muted)] disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-2)] hover:bg-[var(--accent-muted)] disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name || deleteTarget?.email}"?`}
        description="This will permanently delete this inactive account along with all their orders, reviews, and associated data. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} inactive account${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} account${selectedIds.size > 1 ? "s" : ""} and ALL their associated data. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
