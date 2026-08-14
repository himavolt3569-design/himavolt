"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Store,
  Loader2,
  UserCog,
  ChevronRight as Arrow,
} from "lucide-react";

interface StaffRecord {
  id: string;
  role: string;
  staffType: string;
  isActive: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null; imageUrl: string | null } | null;
  restaurant: { id: string; name: string; type: string; city: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ["All", "SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER", "CHEF"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  CHEF: "Chef",
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export default function AllStaffTab({
  onOpenUser,
}: {
  onOpenUser?: (userId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const query = useQuery({
    queryKey: ["admin-staff", page, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      if (roleFilter !== "All") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/staff?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load staff");
      const data = await res.json();
      return { staff: (data.staff ?? []) as StaffRecord[], pagination: data.pagination as Pagination };
    },
    placeholderData: keepPreviousData,
  });

  const staff = query.data?.staff ?? [];
  const pagination = query.data?.pagination ?? null;
  const loading = query.isFetching;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-staff"] });

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[var(--text-1)]">Staff members</h3>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-3)]">
            {(pagination?.total ?? 0).toLocaleString()} across all restaurants and hotels.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Search name, email, restaurant…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-slate-400 focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--border)] transition-all sm:w-64"
            />
          </div>
          <button
            onClick={refresh}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--text-1)] px-4 py-2.5 text-sm font-semibold text-[var(--canvas)] hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => { setRoleFilter(r); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              roleFilter === r
                ? "bg-[var(--text-1)] text-[var(--canvas)] shadow-sm"
                : "bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
            }`}
          >
            {r === "All" ? "All roles" : roleLabel(r)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && staff.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--text-3)]" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] py-20 text-center">
          <UserCog className="mx-auto mb-2 h-8 w-8 text-[var(--text-3)]" />
          <p className="text-sm font-semibold text-[var(--text-2)]">No staff found</p>
          <p className="mt-1 text-sm text-[var(--text-3)]">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {staff.map((s) => {
            const userId = s.user?.id;
            const clickable = !!userId && !!onOpenUser;
            return (
              <motion.button
                key={s.id}
                layout
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onOpenUser!(userId!)}
                className={`flex items-center gap-4 rounded-[1.75rem] border bg-[var(--surface)] p-4 text-left transition-all ${
                  clickable
                    ? "border-[var(--border-soft)] hover:border-[var(--border)] hover:shadow-md cursor-pointer"
                    : "border-[var(--border-soft)] cursor-default opacity-80"
                }`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface-alt)]">
                  {s.user?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.user.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold uppercase text-[var(--text-3)]">
                      {s.user?.name?.slice(0, 2) || "S"}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-[var(--text-1)]">{s.user?.name || "Unnamed"}</h4>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                      {roleLabel(s.role)}
                    </span>
                    {!s.isActive && (
                      <span className="rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-[var(--text-3)]">
                    <Mail className="h-3 w-3 shrink-0" /> {s.user?.email || "No email"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] font-medium text-[var(--text-3)]">
                    <span className="inline-flex items-center gap-1">
                      <Store className="h-3 w-3" /> {s.restaurant?.name ?? "—"}
                    </span>
                    {s.user?.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {s.user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {clickable && <Arrow className="h-4 w-4 shrink-0 text-[var(--text-3)]" />}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-xs font-semibold text-[var(--text-2)]">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
