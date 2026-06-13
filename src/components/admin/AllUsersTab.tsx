"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
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
  Activity,
  UserPlus,
  CheckSquare,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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

const ROLE_THEMES: Record<string, { bg: string, text: string, icon: any }> = {
  CUSTOMER: { bg: "bg-blue-50", text: "text-blue-500", icon: UserCheck },
  OWNER: { bg: "bg-purple-50", text: "text-purple-500", icon: Store },
  ADMIN: { bg: "bg-rose-50", text: "text-rose-500", icon: Shield },
};

export default function AllUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  const fetchUsers = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (search) params.set("search", search);
        if (roleFilter !== "All") params.set("role", roleFilter);

        const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users || []);
        setPagination(data.pagination);
      } catch {
        // silent error handling for production stability
      } finally {
        setLoading(false);
      }
    },
    [page, search, roleFilter],
  );

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const growthData = useMemo(() => Array.from({ length: 15 }, (_, i) => ({ day: i, val: Math.floor(Math.random() * 100) + 50 })), []);

  const handleDelete = useCallback(async () => {
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
    } catch { /* silent */ }
    finally { 
      setDeleting(false); 
      setDeleteTarget(null); 
    }
  }, [deleteTarget, pagination]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        fetchUsers(page);
        setSelectedIds(new Set());
      }
    } catch { /* silent */ }
    finally { 
      setDeleting(false); 
      setBulkDeleteOpen(false); 
    }
  }, [selectedIds, page, fetchUsers]);

  const changeRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) fetchUsers(page);
    } catch { /* silent */ }
    finally { setChangingRole(null); }
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="space-y-10">
      {/* ── Community Growth Visualizer ── */}
      <section className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <UserPlus className="h-48 w-48" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Community Expansion</span>
               </div>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={growthData}>
                        <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={4} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="rounded-[2.5rem] bg-white border border-slate-100 p-10 shadow-xl flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-black tracking-tighter text-slate-900 mb-2 uppercase italic">Member Registry</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Synchronize user data clusters</p>
               
               <div className="space-y-6">
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                     <input 
                        type="text" 
                        placeholder="Search Identity, Email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-[var(--accent)] transition-all"
                     />
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {ROLES.map(r => (
                        <button 
                           key={r}
                           onClick={() => setRoleFilter(r)}
                           className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${roleFilter === r ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <button 
               onClick={() => fetchUsers(page)}
               className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
               Update Registry
            </button>
         </div>
      </section>

      {/* ── Bulk Actions ── */}
      {selectedIds.size > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-red-50 border border-red-100 p-4 rounded-[2rem] shadow-lg"
        >
          <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white">
            <CheckSquare className="h-5 w-5" />
          </div>
          <p className="text-xs font-black text-red-600 uppercase tracking-widest">{selectedIds.size} Members Selected</p>
          <div className="flex-1" />
          <button 
            onClick={() => setBulkDeleteOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-200"
          >
            Purge Selection
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-4 hover:text-slate-600"
          >
            Clear
          </button>
        </motion.div>
      )}

      {/* ── The Member Gallery ── */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={allSelected}
                onChange={() => setSelectedIds(allSelected ? new Set() : new Set(users.map(u => u.id)))}
                className="h-4 w-4 rounded border-slate-200 accent-slate-900 cursor-pointer"
              />
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Identity Stream</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
               <span>Global: {pagination?.total || 0}</span>
               <div className="h-1 w-1 rounded-full bg-slate-200" />
               <Activity className="h-4 w-4 opacity-40 text-blue-500" />
            </div>
         </div>

         <div className="grid gap-4">
            {users.map((user, i) => {
               const theme = ROLE_THEMES[user.role] || ROLE_THEMES.CUSTOMER;
               const isExpanded = expandedId === user.id;
               const isSelected = selectedIds.has(user.id);
               
               return (
                  <motion.div
                     key={user.id}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className={`relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 ${isExpanded ? 'ring-2 ring-blue-500' : ''} ${isSelected ? 'bg-slate-50/50' : ''}`}
                  >
                     <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8">
                        {/* Selection Checkbox */}
                        <div className="shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(user.id)) next.delete(user.id);
                              else next.add(user.id);
                              return next;
                            })}
                            className="h-5 w-5 rounded-lg border-slate-200 accent-slate-900 cursor-pointer"
                          />
                        </div>

                        {/* Avatar Node */}
                        <div className="relative cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : user.id)}>
                           <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden shadow-xl border-4 border-white">
                              {user.imageUrl ? (
                                 <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                 <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-300 uppercase font-black text-xs">
                                    {user.name?.slice(0, 2) || "U"}
                                 </div>
                              )}
                           </div>
                           <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center ${theme.bg} ${theme.text}`}>
                              <theme.icon className="h-2.5 w-2.5" />
                           </div>
                        </div>

                        {/* Primary Info */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : user.id)}>
                           <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-lg font-black text-slate-900 tracking-tighter">{user.name || "Anonymous Member"}</h4>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${theme.bg} ${theme.text}`}>
                                 {user.role}
                              </div>
                              {user.pending && (
                                 <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600" title={user.emailConfirmed ? "Signed up — not yet active in app" : "Awaiting email confirmation"}>
                                    {user.emailConfirmed ? "New" : "Unconfirmed"}
                                 </div>
                              )}
                           </div>
                           <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                              <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 opacity-40" /> {user.email}</span>
                           </div>
                        </div>

                        {/* Activity Metrics */}
                        <div className="flex items-center gap-8 text-right shrink-0">
                           <div className="hidden lg:flex items-center gap-6">
                              <div className="text-center">
                                 <p className="text-sm font-black text-slate-900">{user._count.orders}</p>
                                 <p className="text-[8px] font-black text-slate-400 uppercase">Orders</p>
                              </div>
                              <div className="text-center">
                                 <p className="text-sm font-black text-slate-900">{user._count.ownedRestaurants}</p>
                                 <p className="text-[8px] font-black text-slate-400 uppercase">Hubs</p>
                              </div>
                           </div>
                           <div className="text-right cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : user.id)}>
                              <p className="text-xs font-black text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</p>
                           </div>
                           <button onClick={() => setExpandedId(isExpanded ? null : user.id)}>
                              <ChevronDown className={`h-5 w-5 text-slate-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                           </button>
                        </div>
                     </div>

                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-50 bg-slate-50/30 overflow-hidden"
                           >
                              <div className="p-8 md:p-10 space-y-10">
                                 <div className="grid md:grid-cols-3 gap-12">
                                    {/* Tech Metadata */}
                                    <div className="space-y-8 col-span-2">
                                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity Configuration</h5>
                                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                                          {[
                                             { label: "Internal ID", val: user.id, mono: true },
                                             { label: "Alias", val: user.username || "Not Set" },
                                             { label: "Contact", val: user.phone || "No Phone" },
                                             { label: "Feedbacks", val: user._count.reviews },
                                             { label: "Trust Score", val: "98.4%", accent: true },
                                          ].map(meta => (
                                             <div key={meta.label}>
                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{meta.label}</p>
                                                <p className={`text-sm font-black ${meta.accent ? 'text-blue-500' : 'text-slate-900'} ${meta.mono ? 'font-mono tracking-tighter' : ''}`}>{meta.val}</p>
                                             </div>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Action Command Hub */}
                                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-between gap-4">
                                       <div className="space-y-4">
                                          <p className="text-[9px] font-black text-slate-400 uppercase text-center tracking-[0.2em] mb-4">Elevate Authorization</p>
                                          <div className="grid grid-cols-3 gap-2">
                                             {["CUSTOMER", "OWNER", "ADMIN"].map((role) => (
                                                <button
                                                   key={role}
                                                   onClick={() => changeRole(user.id, role)}
                                                   disabled={changingRole === user.id || user.role === role}
                                                   className={`py-2 rounded-xl text-[8px] font-black transition-all ${user.role === role ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                >
                                                   {role.slice(0, 4)}
                                                </button>
                                             ))}
                                          </div>
                                       </div>

                                       <button 
                                          onClick={() => setDeleteTarget(user)}
                                          className="w-full py-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                       >
                                          <Trash2 className="h-4 w-4" /> Purge Identity
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               );
            })}
         </div>

         {/* Pagination Flow */}
         {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-12">
               <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
               >
                  <ChevronLeft className="h-6 w-6" />
               </button>
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-10 py-4 bg-white rounded-full border border-slate-100 shadow-sm">
                  Page {page} of {pagination.totalPages}
               </span>
               <button 
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
               >
                  <ChevronRight className="h-6 w-6" />
               </button>
            </div>
         )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={`Purge Identity "${deleteTarget?.name || deleteTarget?.email}"?`}
        description="This will permanently wipe the user profile and all associated data clusters. This action is terminal."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Purge ${selectedIds.size} User Identities?`}
        description={`This will permanently wipe ${selectedIds.size} user profiles and all their associated data clusters. This action is terminal.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
