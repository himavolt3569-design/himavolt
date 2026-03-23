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
} from "lucide-react";

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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

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
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gompa-slate placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            showFilters || roleFilter !== "All"
              ? "border-saffron-flame bg-saffron-flame/5 text-saffron-flame"
              : "border-gray-200 text-gray-600 hover:bg-brand-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={() => fetchUsers(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-gray-400">{pagination.total.toLocaleString()} users</span>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-2">
              <p className="mb-1 text-[11px] font-medium text-gray-400 uppercase">Role</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setPage(1); }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      roleFilter === r ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
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

      {/* Users List */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-brand-100 px-4 py-2.5">
          <Users className="h-4 w-4 text-brand-400" />
          <span className="text-xs font-semibold text-gray-500">All Users</span>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user) => {
              const isExpanded = expandedId === user.id;
              return (
                <div key={user.id} className="transition-all hover:bg-brand-50/40">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 overflow-hidden">
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt={user.name} className="h-10 w-10 object-cover rounded-full" />
                      ) : (
                        <Users className="h-5 w-5 text-brand-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gompa-slate truncate">{user.name || "Unnamed"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="hidden flex-shrink-0 gap-3 text-xs text-gray-400 sm:flex">
                      <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{user._count.orders}</span>
                      <span className="flex items-center gap-1"><Store className="h-3 w-3" />{user._count.ownedRestaurants}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{user._count.reviews}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-brand-100 bg-brand-50/30 px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-gray-400">Username</span>
                              <p className="font-medium text-gompa-slate">{user.username || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Phone</span>
                              <p className="font-medium text-gompa-slate">{user.phone || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Orders</span>
                              <p className="font-bold text-gompa-slate">{user._count.orders}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Restaurants</span>
                              <p className="font-bold text-gompa-slate">{user._count.ownedRestaurants}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Reviews</span>
                              <p className="font-medium text-gompa-slate">{user._count.reviews}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Joined</span>
                              <p className="font-medium text-gompa-slate">{new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400">User ID</span>
                              <p className="font-mono text-gompa-slate text-[11px]">{user.id}</p>
                            </div>
                          </div>

                          {/* Role changer */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-medium text-gray-500">Change Role:</span>
                            {["CUSTOMER", "OWNER", "ADMIN"].map((role) => (
                              <button
                                key={role}
                                onClick={() => changeRole(user.id, role)}
                                disabled={changingRole === user.id || user.role === role}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-40 ${
                                  user.role === role
                                    ? "bg-gompa-slate text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                                }`}
                              >
                                {changingRole === user.id ? "..." : role}
                              </button>
                            ))}
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
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
