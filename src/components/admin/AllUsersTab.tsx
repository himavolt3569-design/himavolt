"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Shield,
  Store,
  ShoppingBag,
  Star,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  Trash2,
  CheckSquare,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  username: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number; ownedRestaurants: number; reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ["All", "CUSTOMER", "OWNER", "ADMIN"];
const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function AllUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
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
        if (roleFilter !== "All") params.set("role", roleFilter);

        const res = await fetch(`/api/admin/users?${params}`);
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
    [page, search, roleFilter],
  );

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter]);

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

  const changeRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role } : u)),
        );
      }
    } catch {
      // silent
    } finally {
      setChangingRole(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Search users by name, email, phone..."
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
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            showFilters || roleFilter !== "All"
              ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchUsers(page)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-[var(--text-3)]">{pagination.total.toLocaleString()} users</span>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Clear
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-2">
              <p className="mb-1 text-[11px] font-medium text-[var(--text-3)] uppercase">Role</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setPage(1); }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      roleFilter === r ? "bg-[var(--text-1)] text-white" : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
                    }`}
                  >
                    {r === "All" ? "All Roles" : r}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-2xl border border-[var(--accent-muted)] bg-[var(--canvas)] shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--accent-muted)] px-4 py-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelectedIds(allSelected ? new Set() : new Set(users.map((u) => u.id)))}
            className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
          />
          <Users className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text-2)]">All Users</span>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-3)]">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {users.map((user) => {
              const isExpanded = expandedId === user.id;
              const isSelected = selectedIds.has(user.id);
              return (
                <div key={user.id} className={`transition-all hover:bg-[var(--accent-muted)]/40 ${isSelected ? "bg-red-50/40" : ""}`}>
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
                        <Users className="h-5 w-5 text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-1)] truncate">{user.name || "Unnamed"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[user.role] || "bg-[var(--surface)] text-[var(--text-2)]"}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-2)] truncate">{user.email}</p>
                    </div>
                    <div className="hidden flex-shrink-0 gap-3 text-xs text-[var(--text-3)] sm:flex">
                      <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{user._count.orders}</span>
                      <span className="flex items-center gap-1"><Store className="h-3 w-3" />{user._count.ownedRestaurants}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{user._count.reviews}</span>
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
                        <div className="border-t border-[var(--accent-muted)] bg-[var(--accent-muted)]/30 px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-[var(--text-3)]">Username</span>
                              <p className="font-medium text-[var(--text-1)]">{user.username || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Phone</span>
                              <p className="font-medium text-[var(--text-1)]">{user.phone || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Orders</span>
                              <p className="font-bold text-[var(--text-1)]">{user._count.orders}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Restaurants</span>
                              <p className="font-bold text-[var(--text-1)]">{user._count.ownedRestaurants}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Reviews</span>
                              <p className="font-medium text-[var(--text-1)]">{user._count.reviews}</p>
                            </div>
                            <div>
                              <span className="text-[var(--text-3)]">Joined</span>
                              <p className="font-medium text-[var(--text-1)]">{new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[var(--text-3)]">User ID</span>
                              <p className="font-mono text-[var(--text-1)] text-[11px]">{user.id}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-medium text-[var(--text-2)]">Change Role:</span>
                            {["CUSTOMER", "OWNER", "ADMIN"].map((role) => (
                              <button
                                key={role}
                                onClick={() => changeRole(user.id, role)}
                                disabled={changingRole === user.id || user.role === role}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-40 ${
                                  user.role === role
                                    ? "bg-[var(--text-1)] text-white"
                                    : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--accent-muted)]"
                                }`}
                              >
                                {changingRole === user.id ? "..." : role}
                              </button>
                            ))}
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete User
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
        description="This will permanently delete the user, their orders, reviews, and all associated data. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} user${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} user${selectedIds.size > 1 ? "s" : ""} and ALL their associated data (orders, reviews). This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
