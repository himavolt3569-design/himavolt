"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  ChefHat,
  X,
  Check,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  KeyRound,
} from "lucide-react";
import {
  useRestaurant,
  type Restaurant,
  type StaffMember,
} from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";

type StaffRole = "SUPER_ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

const ROLE_ICONS: Record<StaffRole, typeof Shield> = {
  SUPER_ADMIN: Shield,
  MANAGER: UserCheck,
  CHEF: ChefHat,
  WAITER: UserCheck,
  CASHIER: UserCheck,
};

const ROLE_COLORS: Record<
  StaffRole,
  { bg: string; text: string; border: string }
> = {
  SUPER_ADMIN: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  MANAGER: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  CHEF: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  WAITER: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  CASHIER: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CHEF: "Chef",
  WAITER: "Waiter",
  CASHIER: "Cashier",
};

const ALL_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "CHEF",
  "WAITER",
  "CASHIER",
];

interface AttendanceLog {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  staff: {
    role: string;
    user: { name: string };
  };
}

export default function StaffManagementTab() {
  const {
    selectedRestaurant,
    restaurants,
    addStaff,
    removeStaff,
    toggleStaffActive,
  } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">(
    "directory",
  );
  const [showModal, setShowModal] = useState(false);

  if (!restaurant) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1F2A2A]">
              Staff Management
            </h2>
            {restaurant.restaurantCode && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 tracking-wider">
                  CODE:{" "}
                  <span className="font-mono">{restaurant.restaurantCode}</span>
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage team members for{" "}
            <strong className="text-[#1F2A2A]">{restaurant.name}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#0A4D3C] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0A4D3C]/20 transition-all hover:bg-[#083a2d] active:scale-[0.97]"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab("directory")}
          className={`group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
            activeTab === "directory"
              ? "border-[#0A4D3C] text-[#0A4D3C]"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4" />
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
            activeTab === "attendance"
              ? "border-[#0A4D3C] text-[#0A4D3C]"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Attendance Logs
        </button>
      </div>

      {activeTab === "directory" ? (
        <StaffDirectoryView
          restaurant={restaurant}
          removeStaff={removeStaff}
          toggleStaffActive={toggleStaffActive}
        />
      ) : (
        <AttendanceLogsView restaurantId={restaurant.id} />
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        open={showModal}
        onClose={() => setShowModal(false)}
        restaurantId={restaurant.id}
      />
    </div>
  );
}

function AttendanceLogsView({ restaurantId }: { restaurantId: string }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiFetch<AttendanceLog[]>(
        `/api/restaurants/${restaurantId}/attendance`,
      );
      setLogs(data ?? []);
    } catch (err) {
      console.error("[AttendanceLogs] Failed to load:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (loading)
    return (
      <div className="py-10 text-center text-sm font-bold text-gray-400">
        Loading attendance...
      </div>
    );

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-1 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[minmax(140px,2fr)_1fr_1fr_1fr] items-center gap-4 border-b border-gray-50 bg-gray-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
        <div>Staff Member</div>
        <div>Date</div>
        <div>Check In</div>
        <div>Check Out</div>
      </div>
      {logs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Calendar className="h-8 w-8 text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No attendance logs</p>
          <p className="text-xs text-gray-400 mt-1">
            Staff punch records will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[minmax(140px,2fr)_1fr_1fr_1fr] items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 font-bold text-xs uppercase">
                  {log.staff.user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F2A2A]">
                    {log.staff.user.name}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500">
                    {log.staff.role}
                  </p>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600">
                {new Date(log.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#0A4D3C]">
                <Clock className="h-3.5 w-3.5" />
                {new Date(log.checkIn).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                {log.checkOut ? (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    {new Date(log.checkOut).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                ) : (
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600 border border-orange-100">
                    Working
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffDirectoryView({
  restaurant,
  removeStaff,
  toggleStaffActive,
}: {
  restaurant: Restaurant;
  removeStaff: (rid: string, sid: string) => void;
  toggleStaffActive: (rid: string, sid: string) => void;
}) {
  const { fetchRestaurants } = useRestaurant();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<StaffRole | "all">("all");
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSavePin = async (staffId: string) => {
    if (!/^\d{4}$/.test(newPin)) return;
    setSavingPin(true);
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/staff/${staffId}`, {
        method: "PATCH",
        body: { pin: newPin },
      });
      await fetchRestaurants();
      setEditingPin(null);
      setNewPin("");
    } catch {
      // stay in edit mode
    } finally {
      setSavingPin(false);
    }
  };

  const staff = restaurant.staff.filter((s: StaffMember) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 outline-none transition-all focus:border-[#FF9933] focus:ring-2 focus:ring-[#FF9933]/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", ...ALL_ROLES] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filterRole === role
                  ? "bg-[#1F2A2A] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {role === "all" ? "All Roles" : ROLE_LABELS[role as StaffRole]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Staff",
            value: restaurant.staff.length,
            color: "text-[#1F2A2A]",
          },
          {
            label: "Active",
            value: restaurant.staff.filter((s: StaffMember) => s.isActive)
              .length,
            color: "text-emerald-600",
          },
          {
            label: "Inactive",
            value: restaurant.staff.filter((s: StaffMember) => !s.isActive)
              .length,
            color: "text-amber-600",
          },
          {
            label: "Roles Used",
            value: new Set(restaurant.staff.map((s: StaffMember) => s.role))
              .size,
            color: "text-blue-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {staff.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <UserX className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-bold text-gray-500">No staff members found</p>
              <p className="text-sm text-gray-400 mt-1">
                Add your first team member to get started
              </p>
            </motion.div>
          ) : (
            staff.map((member: StaffMember, i: number) => {
              const roleKey = member.role as StaffRole;
              const RoleIcon = ROLE_ICONS[roleKey] ?? Shield;
              const colors = ROLE_COLORS[roleKey] ?? ROLE_COLORS.WAITER;
              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors.bg}`}
                  >
                    <RoleIcon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#1F2A2A] truncate">
                        {member.user.name}
                      </h4>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {ROLE_LABELS[roleKey] ?? member.role}
                      </span>
                      {!member.isActive && (
                        <span className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {member.user.email} &middot; {member.user.phone ?? "–"}
                    </p>
                    {/* PIN display / edit */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {editingPin === member.id ? (
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            value={newPin}
                            onChange={(e) =>
                              setNewPin(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            placeholder="4-digit PIN"
                            autoFocus
                            className="w-20 rounded-md border border-amber-300 bg-amber-50/50 px-2 py-0.5 font-mono text-xs font-bold text-[#1F2A2A] outline-none focus:ring-2 focus:ring-amber-200 tracking-widest"
                          />
                          <button
                            onClick={() => handleSavePin(member.id)}
                            disabled={!/^\d{4}$/.test(newPin) || savingPin}
                            className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-all"
                            title="Save PIN"
                          >
                            {savingPin ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPin(null);
                              setNewPin("");
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="h-3 w-3 text-gray-400" />
                          <span className="font-mono text-xs font-bold text-gray-600 tracking-widest bg-gray-50 px-1.5 py-0.5 rounded">
                            {visiblePins.has(member.id) ? member.pin : "••••"}
                          </span>
                          <button
                            onClick={() => togglePinVisibility(member.id)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                            title={
                              visiblePins.has(member.id)
                                ? "Hide PIN"
                                : "Show PIN"
                            }
                          >
                            {visiblePins.has(member.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPin(member.id);
                              setNewPin(member.pin);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            title="Change PIN"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        toggleStaffActive(restaurant.id, member.id)
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                        member.isActive
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                      title={member.isActive ? "Deactivate" : "Activate"}
                    >
                      {member.isActive ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeStaff(restaurant.id, member.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AddStaffModal({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const { addStaff } = useRestaurant();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("WAITER");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{
    pin: string;
    code: string;
    name: string;
  } | null>(null);

  const reset = useCallback(() => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("WAITER");
    setSuccessData(null);
    setErrorMsg("");
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || saving) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const result = await addStaff(restaurantId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        pin: "auto",
      });
      if (result?._generatedPin) {
        setSuccessData({
          pin: result._generatedPin,
          code: result._restaurantCode ?? "Pending Sync",
          name: name.trim(),
        });
      } else {
        reset();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() && email.trim();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
              mass: 0.7,
            }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#1F2A2A]">
                {successData ? "Staff Added Successfully!" : "Add Staff Member"}
              </h3>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {successData ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-emerald-50 p-6 text-center border border-emerald-100">
                  <Shield className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    Please share these login details with{" "}
                    <span className="font-bold">{successData.name}</span>.
                  </p>
                  <p className="text-xs text-emerald-600 mb-4">
                    They will need both the code and the PIN to log in.
                  </p>

                  <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Restaurant Code
                      </span>
                      <span className="font-mono text-lg font-black text-[#1F2A2A] tracking-widest bg-gray-100 px-3 py-1 rounded-lg">
                        {successData.code}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Login PIN
                      </span>
                      <span className="font-mono text-2xl font-black text-[#FF9933] tracking-widest bg-orange-50 px-3 py-1 rounded-lg">
                        {successData.pin}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#0A4D3C]/20 transition-all hover:bg-[#083a2d] active:scale-[0.97]"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2A2A] mb-1.5">
                      Full Name <span className="text-[#FF9933]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ram Shrestha"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 outline-none transition-all focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2A2A] mb-1.5">
                      Email <span className="text-[#FF9933]">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@restaurant.com"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 outline-none transition-all focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2A2A] mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="98XXXXXXXX"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#1F2A2A] placeholder-gray-400 outline-none transition-all focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2A2A] mb-2">
                      Role <span className="text-[#FF9933]">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((r) => {
                        const colors = ROLE_COLORS[r];
                        return (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                              role === r
                                ? `${colors.bg} ${colors.text} ${colors.border}`
                                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600">
                    {errorMsg}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-[#1F2A2A] hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                      isValid && !saving
                        ? "bg-[#0A4D3C] shadow-[#0A4D3C]/20 hover:bg-[#083a2d]"
                        : "bg-gray-300 shadow-none cursor-not-allowed"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    {saving ? "Adding…" : "Add Staff"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
