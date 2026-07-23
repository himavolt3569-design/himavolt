"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  User,
  Info,
  X,
  Check,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";

interface StaffRecord {
  id: string;
  role: string;
  staffType: string;
  user: { name: string; email: string };
}

interface ShiftRecord {
  id: string;
  label: string | null;
  date: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  staffId: string;
  staff: { id: string; staffType: string; user: { name: string; email: string } };
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CHEF: "Chef",
  WAITER: "Waiter",
  CASHIER: "Cashier",
};

function hasOverlap(shifts: ShiftRecord[]): boolean {
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const a = shifts[i];
      const b = shifts[j];
      if (a.staffId !== b.staffId) continue;
      const aStart = a.startTime;
      const aEnd = a.endTime;
      const bStart = b.startTime;
      const bEnd = b.endTime;
      // Simple overlap: aStart < bEnd && bStart < aEnd
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

export default function ShiftsTab() {
  const { selectedRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurantId = selectedRestaurant?.id;

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  // Seed from the warm GET cache so re-opening paints instantly.
  const shiftsPath = restaurantId ? `/api/restaurants/${restaurantId}/shifts?date=${selectedDate}` : "";
  const staffPath = restaurantId ? `/api/restaurants/${restaurantId}/staff` : "";
  const [shifts, setShifts] = useState<ShiftRecord[]>(() => peekApiCache<ShiftRecord[]>(shiftsPath) ?? []);
  const [staffList, setStaffList] = useState<StaffRecord[]>(() => peekApiCache<StaffRecord[]>(staffPath) ?? []);
  const [loading, setLoading] = useState(() => !peekApiCache(shiftsPath));
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    staffId: "",
    startTime: "09:00",
    endTime: "17:00",
    label: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    label: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const shiftBasedStaff = staffList.filter((s) => s.staffType === "SHIFT_BASED");
  const fullTimeStaff = staffList.filter((s) => s.staffType === "FULL_TIME");

  const loadStaff = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch(`/api/restaurants/${restaurantId}/staff`);
      setStaffList((data as StaffRecord[]) ?? []);
    } catch {
      /* ignore */
    }
  }, [restaurantId]);

  const loadShifts = useCallback(async () => {
    if (!restaurantId) return;
    if (!peekApiCache(`/api/restaurants/${restaurantId}/shifts?date=${selectedDate}`)) setLoading(true);
    try {
      const data = await apiFetch(
        `/api/restaurants/${restaurantId}/shifts?date=${selectedDate}`,
      );
      setShifts((data as ShiftRecord[]) ?? []);
    } catch {
      showToast("Failed to load shifts", "error");
    }
    setLoading(false);
  }, [restaurantId, selectedDate, showToast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Initialize staffId in add form when staff list loads
  useEffect(() => {
    if (shiftBasedStaff.length > 0 && !addForm.staffId) {
      setAddForm((f) => ({ ...f, staffId: shiftBasedStaff[0].id }));
    }
  }, [shiftBasedStaff, addForm.staffId]);

  const handleAddShift = async () => {
    if (!restaurantId) return;
    if (!addForm.staffId) {
      showToast("Select a staff member", "error");
      return;
    }
    if (addForm.startTime >= addForm.endTime) {
      showToast("Start time must be before end time", "error");
      return;
    }
    setAddLoading(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/shifts`, {
        method: "POST",
        body: {
          staffId: addForm.staffId,
          date: selectedDate,
          startTime: addForm.startTime,
          endTime: addForm.endTime,
          label: addForm.label || undefined,
        },
      });
      showToast("Shift created", "success");
      setShowAddForm(false);
      setAddForm((f) => ({ ...f, label: "", startTime: "09:00", endTime: "17:00" }));
      loadShifts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create shift", "error");
    }
    setAddLoading(false);
  };

  const startEdit = (shift: ShiftRecord) => {
    setEditingShiftId(shift.id);
    setEditForm({
      startTime: shift.startTime,
      endTime: shift.endTime,
      label: shift.label ?? "",
    });
  };

  const handleSaveEdit = async (shiftId: string) => {
    if (!restaurantId) return;
    setEditLoading(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/shifts/${shiftId}`, {
        method: "PATCH",
        body: {
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          label: editForm.label || undefined,
        },
      });
      showToast("Shift updated", "success");
      setEditingShiftId(null);
      loadShifts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update shift", "error");
    }
    setEditLoading(false);
  };

  const handleDelete = async (shiftId: string) => {
    if (!restaurantId) return;
    if (!window.confirm("Delete this shift? Orders during this window will move to Unassigned.")) return;
    setDeletingId(shiftId);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/shifts/${shiftId}`, {
        method: "DELETE",
      });
      showToast("Shift deleted", "success");
      loadShifts();
    } catch {
      showToast("Failed to delete shift", "error");
    }
    setDeletingId(null);
  };

  const overlapping = hasOverlap(shifts);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--text-1)]">Shift Management</h2>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Define time-window shifts for Shift-Based staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2">
            <Calendar className="h-4 w-4 text-[var(--text-3)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium text-[var(--text-1)] outline-none bg-transparent"
            />
          </div>
          {shiftBasedStaff.length > 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text-1)] px-4 py-2 text-sm font-bold text-[var(--canvas)] hover:bg-[#2c1508] transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Shift
            </button>
          )}
        </div>
      </div>

      {/* Full-time staff info banner */}
      {fullTimeStaff.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
          <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-indigo-700">Full-Time Staff: Always Active</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {fullTimeStaff.map((s) => s.user.name).join(", ")} do not require shift windows.
              Their orders are attributed by who processed them in the POS.
            </p>
          </div>
        </div>
      )}

      {/* Overlap warning */}
      {overlapping && (
        <div className="flex items-start gap-3 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[var(--accent-text)]">Overlapping Shifts Detected</p>
            <p className="text-xs text-[var(--accent-text)] mt-0.5">
              Orders during the overlap will be attributed to the earlier shift (first-match).
              Consider adjusting shift boundaries to avoid gaps.
            </p>
          </div>
        </div>
      )}

      {/* Add shift form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-[var(--text-1)]/20 bg-[var(--text-1)]/5 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-[var(--text-1)]">New Shift</p>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-full bg-[var(--surface)] p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Staff Member
                </label>
                <select
                  value={addForm.staffId}
                  onChange={(e) => setAddForm((f) => ({ ...f, staffId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/10"
                >
                  {shiftBasedStaff.length === 0 && (
                    <option value="">No shift-based staff available</option>
                  )}
                  {shiftBasedStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.name} ({ROLE_LABELS[s.role] ?? s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={addForm.label}
                  onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning Shift"
                  maxLength={80}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                  Start Time
                </label>
                <input
                  type="time"
                  value={addForm.startTime}
                  onChange={(e) => setAddForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                  End Time
                </label>
                <input
                  type="time"
                  value={addForm.endTime}
                  onChange={(e) => setAddForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShift}
                disabled={addLoading || shiftBasedStaff.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--text-1)] px-4 py-2 text-sm font-bold text-[var(--canvas)] hover:bg-[#2c1508] disabled:opacity-50 transition-all"
              >
                {addLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Shift
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No shift-based staff notice */}
      {!loading && shiftBasedStaff.length === 0 && (
        <div className="rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-4 py-6 text-center">
          <User className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
          <p className="text-sm font-bold text-[var(--text-3)]">No shift-based staff</p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Go to Staff tab and set a staff member as Shift-Based to manage their shifts.
          </p>
        </div>
      )}

      {/* Shift list */}
      {loading && shifts.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.length === 0 && shiftBasedStaff.length > 0 && (
            <div className="rounded-2xl bg-[var(--canvas-sub)] border border-[var(--border-soft)] px-4 py-8 text-center">
              <Clock className="mx-auto h-8 w-8 text-[var(--text-3)] mb-2" />
              <p className="text-sm font-bold text-[var(--text-3)]">No shifts defined for this date</p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                Click "Add Shift" to assign a time window to a staff member.
              </p>
            </div>
          )}

          {shifts.map((shift) => (
            <motion.div
              key={shift.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-sm p-4"
            >
              {editingShiftId === shift.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Start
                      </label>
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                        End
                      </label>
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2 text-sm font-medium text-[var(--text-1)] outline-none focus:border-[#3e1e0c]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                        Label
                      </label>
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Optional label"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] px-3 py-2 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none focus:border-[#3e1e0c]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingShiftId(null)}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--surface)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(shift.id)}
                      disabled={editLoading}
                      className="flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {editLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Shift display */
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--text-1)]/10">
                      <User className="h-4 w-4 text-[var(--text-1)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-[var(--text-1)]">
                          {shift.staff.user.name}
                        </span>
                        {shift.label && (
                          <span className="rounded-lg bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--text-1)]">
                            {shift.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-2)] mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">
                          {shift.startTime} – {shift.actualEndTime
                            ? new Date(shift.actualEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (clocked out)"
                            : shift.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(shift)}
                      className="flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      disabled={deletingId === shift.id}
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      {deletingId === shift.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
