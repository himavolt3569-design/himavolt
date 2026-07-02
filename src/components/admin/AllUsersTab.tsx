"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Store,
  Mail,
  UserCheck,
  Trash2,
  Loader2,
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
  pending?: boolean; // in Supabase Auth but not yet provisioned in the app DB
  emailConfirmed?: boolean;
  _count: { orders: number; ownedRestaurants: number; reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ["All", "CUSTOMER", "OWNER", "ADMIN"];

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  OWNER: "Owner",
  ADMIN: "Admin",
};

const ROLE_THEMES: Record<
  string,
  { bg: string; text: string; icon: typeof UserCheck }
> = {
  CUSTOMER: { bg: "bg-blue-50", text: "text-blue-600", icon: UserCheck },
  OWNER: { bg: "bg-purple-50", text: "text-purple-600", icon: Store },
  ADMIN: { bg: "bg-rose-50", text: "text-rose-600", icon: Shield },
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export default function AllUsersTab() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const usersQueryKey = ["admin-users", page, search, roleFilter] as const;
  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      if (roleFilter !== "All") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      return { users: (data.users ?? []) as UserRecord[], pagination: data.pagination as Pagination };
    },
    placeholderData: keepPreviousData,
  });
  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination ?? null;
  const loading = usersQuery.isFetching;
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 500);
  };

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
        queryClient.setQueryData<typeof usersQuery.data>(usersQueryKey, (prev) =>
          prev
            ? {
                users: prev.users.filter((u) => u.id !== deleteTarget.id),
                pagination: prev.pagination ? { ...prev.pagination, total: prev.pagination.total - 1 } : prev.pagination,
              }
            : prev,
        );
      }
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        queryClient.setQueryData<typeof usersQuery.data>(usersQueryKey, (prev) =>
          prev
            ? {
                users: prev.users.filter((u) => !selectedIds.has(u.id)),
                pagination: prev.pagination ? { ...prev.pagination, total: prev.pagination.total - selectedIds.size } : prev.pagination,
              }
            : prev,
        );
        setSelectedIds(new Set());
      }
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  // Optimistic role flip — patches the row immediately instead of waiting on
  // a full re-fetch of the page.
  const changeRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    const previous = queryClient.getQueryData<typeof usersQuery.data>(usersQueryKey);
    queryClient.setQueryData<typeof usersQuery.data>(usersQueryKey, (prev) =>
      prev ? { ...prev, users: prev.users.map((u) => (u.id === userId ? { ...u, role } : u)) } : prev,
    );
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      if (previous) queryClient.setQueryData(usersQueryKey, previous);
    } finally {
      setChangingRole(null);
    }
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="space-y-6">
      {/* ── Controls ── */}
      <div className="flex flex-col gap-4 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-gray-900 font-bold tracking-tight">Users</h3>
          <p className="mt-0.5 text-sm text-gray-500 font-medium">
            {(pagination?.total ?? 0).toLocaleString()} total · search, filter and manage roles.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 font-semibold" />
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 font-bold tracking-tight placeholder:text-gray-400 font-semibold focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all sm:w-64"
            />
          </div>
          <button
            onClick={refreshUsers}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Role filter ── */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              roleFilter === r
                ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20 shadow-sm"
                : "bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] text-gray-500 font-medium hover:bg-gray-50"
            }`}
          >
            {r === "All" ? "All" : roleLabel(r)}
          </button>
        ))}
      </div>

      {/* ── Bulk actions ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-3"
          >
            <span className="text-sm font-semibold text-rose-600">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-gray-500 font-medium hover:text-slate-700"
            >
              Clear
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedIds.size}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List header ── */}
      <div className="flex items-center gap-3 px-2">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() =>
            setSelectedIds(allSelected ? new Set() : new Set(users.map((u) => u.id)))
          }
          className="h-4 w-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-semibold">
          Select all on this page
        </span>
      </div>

      {/* ── Users ── */}
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white py-20 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">No users found</p>
          <p className="mt-1 text-sm text-gray-400 font-semibold">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const theme = ROLE_THEMES[user.role] || ROLE_THEMES.CUSTOMER;
            const isExpanded = expandedId === user.id;
            const isSelected = selectedIds.has(user.id);

            return (
              <motion.div
                key={user.id}
                layout
                className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm transition-all ${
                  isExpanded ? "border-slate-300 shadow-md" : "border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-4 p-4 md:p-5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(user.id)) next.delete(user.id);
                        else next.add(user.id);
                        return next;
                      })
                    }
                    className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900 cursor-pointer"
                  />

                  {/* Avatar */}
                  <div
                    className="relative shrink-0 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-gray-50">
                      {user.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold uppercase text-gray-400 font-semibold">
                          {user.name?.slice(0, 2) || "U"}
                        </div>
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${theme.bg} ${theme.text}`}
                    >
                      <theme.icon className="h-2.5 w-2.5" />
                    </div>
                  </div>

                  {/* Name & email */}
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-bold text-gray-900 font-bold tracking-tight">
                        {user.name || "Unnamed user"}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${theme.bg} ${theme.text}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                      {user.pending && (
                        <span
                          className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600"
                          title={
                            user.emailConfirmed
                              ? "Signed up — not yet active in the app"
                              : "Awaiting email confirmation"
                          }
                        >
                          {user.emailConfirmed ? "New" : "Unconfirmed"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500 font-medium">
                      <Mail className="h-3 w-3 shrink-0 text-gray-400 font-semibold" />
                      {user.email}
                    </p>
                  </div>

                  {/* Counts */}
                  <div className="hidden items-center gap-6 sm:flex">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 font-bold tracking-tight">{user._count.orders}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 font-semibold">
                        Orders
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 font-bold tracking-tight">
                        {user._count.ownedRestaurants}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 font-semibold">
                        Restaurants
                      </p>
                    </div>
                  </div>

                  <div className="hidden text-right lg:block">
                    <p className="text-xs font-semibold text-slate-700">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 font-semibold">
                      Joined
                    </p>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 font-semibold hover:bg-gray-50 hover:text-slate-700"
                    aria-label="Toggle details"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100 bg-gray-50/60"
                    >
                      <div className="grid gap-8 p-5 md:grid-cols-3 md:p-6">
                        {/* Details */}
                        <div className="md:col-span-2">
                          <h5 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 font-semibold">
                            Account details
                          </h5>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                            {[
                              { label: "User ID", val: user.id, mono: true },
                              { label: "Username", val: user.username || "—" },
                              { label: "Phone", val: user.phone || "—" },
                              { label: "Reviews", val: String(user._count.reviews) },
                              {
                                label: "Orders",
                                val: String(user._count.orders),
                              },
                              {
                                label: "Restaurants owned",
                                val: String(user._count.ownedRestaurants),
                              },
                            ].map((meta) => (
                              <div key={meta.label} className="min-w-0">
                                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-semibold">
                                  {meta.label}
                                </p>
                                <p
                                  className={`truncate text-sm font-semibold text-gray-900 font-bold tracking-tight ${
                                    meta.mono ? "font-mono text-xs" : ""
                                  }`}
                                >
                                  {meta.val}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-5 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white p-5">
                          <div>
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-semibold">
                              Change role
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {["CUSTOMER", "OWNER", "ADMIN"].map((role) => (
                                <button
                                  key={role}
                                  onClick={() => changeRole(user.id, role)}
                                  disabled={changingRole === user.id || user.role === role}
                                  className={`flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                                    user.role === role
                                      ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20"
                                      : "bg-gray-50 text-slate-600 hover:bg-gray-100 disabled:opacity-50"
                                  }`}
                                >
                                  {changingRole === user.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    roleLabel(role)
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete user
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white text-gray-500 font-medium hover:text-gray-900 font-bold tracking-tight disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-white text-gray-500 font-medium hover:text-gray-900 font-bold tracking-tight disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name || deleteTarget?.email}"?`}
        description="This permanently removes the user profile and all of their associated data. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} user${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This permanently removes ${selectedIds.size} user profile${
          selectedIds.size > 1 ? "s" : ""
        } and all of their associated data. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
