"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Plus,
  X,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  BellOff,
  Settings,
  UserX,
  MapPin,
  MessageSquare,
  Armchair,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type ReservationStatus =
  | "Pending"
  | "Confirmed"
  | "Seated"
  | "Completed"
  | "No Show"
  | "Cancelled";

type TablePreference = "Indoor" | "Outdoor" | "Window" | "Private";

interface Reservation {
  id: string;
  guestName: string;
  phone: string;
  partySize: number;
  date: string;
  timeSlot: string;
  tablePreference: TablePreference;
  tableAssigned: string;
  status: ReservationStatus;
  specialRequests: string;
  createdAt: string;
}

interface BlacklistedGuest {
  id: string;
  name: string;
  phone: string;
  noShowCount: number;
  blacklistedAt: string;
}

interface CapacitySettings {
  maxPerSlot: number;
  bufferMinutes: number;
  smsReminders: boolean;
}

const TIME_SLOTS = [
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const TABLES: Record<TablePreference, string[]> = {
  Indoor: ["T1", "T2", "T3", "T4", "T5", "T6"],
  Outdoor: ["P1", "P2", "P3", "P4"],
  Window: ["W1", "W2", "W3"],
  Private: ["VIP1", "VIP2"],
};

const TABLE_CAPACITY: Record<string, number> = {
  T1: 2, T2: 4, T3: 4, T4: 6, T5: 8, T6: 2,
  P1: 4, P2: 6, P3: 2, P4: 4,
  W1: 2, W2: 4, W3: 2,
  VIP1: 10, VIP2: 8,
};

const today = "2026-03-15";


const statusColors: Record<ReservationStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-emerald-100 text-emerald-800",
  Seated: "bg-blue-100 text-blue-800",
  Completed: "bg-gray-100 text-gray-700",
  "No Show": "bg-red-100 text-red-800",
  Cancelled: "bg-gray-200 text-gray-500",
};

export default function TableReservationsTab() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistedGuest[]>([]);
  const [view, setView] = useState<"list" | "calendar" | "settings" | "blacklist">("list");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | "All">("All");
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 2 }); // March = index 2
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [capacitySettings, setCapacitySettings] = useState<CapacitySettings>({
    maxPerSlot: 5,
    bufferMinutes: 15,
    smsReminders: true,
  });

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPartySize, setFormPartySize] = useState(2);
  const [formDate, setFormDate] = useState(today);
  const [formTimeSlot, setFormTimeSlot] = useState(TIME_SLOTS[0]);
  const [formPreference, setFormPreference] = useState<TablePreference>("Indoor");
  const [formRequests, setFormRequests] = useState("");

  const autoAssignTable = (preference: TablePreference, partySize: number): string => {
    const available = TABLES[preference];
    const suitable = available.filter((t) => TABLE_CAPACITY[t] >= partySize);
    if (suitable.length === 0) return available[0] || "TBD";
    // Pick smallest suitable table
    suitable.sort((a, b) => TABLE_CAPACITY[a] - TABLE_CAPACITY[b]);
    return suitable[0];
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormPartySize(2);
    setFormDate(today);
    setFormTimeSlot(TIME_SLOTS[0]);
    setFormPreference("Indoor");
    setFormRequests("");
  };

  const createReservation = () => {
    if (!formName.trim() || !formPhone.trim()) return;
    const newRes: Reservation = {
      id: Date.now().toString(),
      guestName: formName.trim(),
      phone: formPhone.trim(),
      partySize: formPartySize,
      date: formDate,
      timeSlot: formTimeSlot,
      tablePreference: formPreference,
      tableAssigned: autoAssignTable(formPreference, formPartySize),
      status: "Pending",
      specialRequests: formRequests.trim(),
      createdAt: today,
    };
    setReservations((prev) => [newRes, ...prev]);
    resetForm();
    setShowForm(false);
  };

  const updateStatus = (id: string, status: ReservationStatus) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    if (status === "No Show") {
      const res = reservations.find((r) => r.id === id);
      if (res) {
        const existing = blacklist.find((b) => b.phone === res.phone);
        if (existing) {
          setBlacklist((prev) =>
            prev.map((b) =>
              b.phone === res.phone ? { ...b, noShowCount: b.noShowCount + 1 } : b
            )
          );
        }
        // Auto-blacklist after 3 no-shows is tracked but manual addition to blacklist
      }
    }
  };

  const addToBlacklist = (res: Reservation) => {
    if (blacklist.some((b) => b.phone === res.phone)) return;
    setBlacklist((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: res.guestName,
        phone: res.phone,
        noShowCount: reservations.filter(
          (r) => r.phone === res.phone && r.status === "No Show"
        ).length,
        blacklistedAt: today,
      },
    ]);
  };

  const removeFromBlacklist = (id: string) => {
    setBlacklist((prev) => prev.filter((b) => b.id !== id));
  };

  const todayReservations = reservations.filter((r) => r.date === today);
  const filteredReservations = reservations.filter((r) => {
    const matchSearch =
      r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery);
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const reservationsForDate = (date: string) =>
    reservations.filter((r) => r.date === date);

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const renderCalendar = () => {
    const { year, month } = calendarMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null)
            return <div key={`empty-${idx}`} className="h-16" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = reservationsForDate(dateStr).length;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`h-16 rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isSelected
                  ? "bg-emerald-600 text-white"
                  : isToday
                  ? "bg-emerald-50 border-2 border-emerald-400 text-emerald-800"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <span className="font-medium">{day}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    isSelected
                      ? "bg-white/30 text-white"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const slotsUsedForDate = (date: string, slot: string) =>
    reservations.filter(
      (r) =>
        r.date === date &&
        r.timeSlot === slot &&
        !["Cancelled", "No Show", "Completed"].includes(r.status)
    ).length;

  const stats = {
    todayTotal: todayReservations.length,
    todayConfirmed: todayReservations.filter((r) => r.status === "Confirmed").length,
    todaySeated: todayReservations.filter((r) => r.status === "Seated").length,
    todayPending: todayReservations.filter((r) => r.status === "Pending").length,
    noShows: reservations.filter((r) => r.status === "No Show").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Table Reservations
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage bookings and table assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["list", "calendar", "blacklist", "settings"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                view === v
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "list"
                ? "Reservations"
                : v === "calendar"
                ? "Calendar"
                : v === "blacklist"
                ? "Blacklist"
                : "Settings"}
            </button>
          ))}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Reservation
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Today Total", value: stats.todayTotal, color: "text-gray-900" },
          { label: "Confirmed", value: stats.todayConfirmed, color: "text-emerald-600" },
          { label: "Seated", value: stats.todaySeated, color: "text-blue-600" },
          { label: "Pending", value: stats.todayPending, color: "text-yellow-600" },
          { label: "No Shows (All)", value: stats.noShows, color: "text-red-600" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Reservation Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  New Reservation
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="+977-98XXXXXXXX"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Party Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formPartySize}
                      onChange={(e) => setFormPartySize(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      {TIME_SLOTS.map((t) => {
                        const used = slotsUsedForDate(formDate, t);
                        return (
                          <option
                            key={t}
                            value={t}
                            disabled={used >= capacitySettings.maxPerSlot}
                          >
                            {t}{" "}
                            {used >= capacitySettings.maxPerSlot ? "(Full)" : `(${used}/${capacitySettings.maxPerSlot})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table Preference
                  </label>
                  <div className="flex gap-2">
                    {(["Indoor", "Outdoor", "Window", "Private"] as TablePreference[]).map(
                      (pref) => (
                        <button
                          key={pref}
                          onClick={() => setFormPreference(pref)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            formPreference === pref
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {pref}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Auto-assigned table: {autoAssignTable(formPreference, formPartySize)} (capacity: {TABLE_CAPACITY[autoAssignTable(formPreference, formPartySize)]})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    value={formRequests}
                    onChange={(e) => setFormRequests(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    placeholder="Allergies, celebrations, seating preferences..."
                  />
                </div>
                {blacklist.some((b) => b.phone === formPhone) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">
                      This phone number is on the blacklist.
                    </span>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createReservation}
                    disabled={!formName.trim() || !formPhone.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Reservation
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reservation Detail Modal */}
      <AnimatePresence>
        {selectedReservation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReservation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reservation Details
                </h3>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Guest</span>
                  <span className="font-medium text-gray-900">
                    {selectedReservation.guestName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm text-gray-700">
                    {selectedReservation.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Party Size</span>
                  <span className="text-sm text-gray-700">
                    {selectedReservation.partySize} guests
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Date & Time</span>
                  <span className="text-sm text-gray-700">
                    {selectedReservation.date} at {selectedReservation.timeSlot}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Table</span>
                  <span className="text-sm text-gray-700">
                    {selectedReservation.tableAssigned} ({selectedReservation.tablePreference})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedReservation.status]
                    }`}
                  >
                    {selectedReservation.status}
                  </span>
                </div>
                {selectedReservation.specialRequests && (
                  <div>
                    <span className="text-sm text-gray-500">Special Requests</span>
                    <p className="text-sm text-gray-700 mt-1 bg-gray-50 rounded-lg p-2">
                      {selectedReservation.specialRequests}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  {selectedReservation.status === "Pending" && (
                    <button
                      onClick={() => {
                        updateStatus(selectedReservation.id, "Confirmed");
                        setSelectedReservation({
                          ...selectedReservation,
                          status: "Confirmed",
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                    </button>
                  )}
                  {["Pending", "Confirmed"].includes(selectedReservation.status) && (
                    <>
                      <button
                        onClick={() => {
                          updateStatus(selectedReservation.id, "Seated");
                          setSelectedReservation({
                            ...selectedReservation,
                            status: "Seated",
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                      >
                        <Armchair className="w-3.5 h-3.5" /> Seat
                      </button>
                      <button
                        onClick={() => {
                          updateStatus(selectedReservation.id, "No Show");
                          setSelectedReservation({
                            ...selectedReservation,
                            status: "No Show",
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                      >
                        <UserX className="w-3.5 h-3.5" /> No Show
                      </button>
                      <button
                        onClick={() => {
                          updateStatus(selectedReservation.id, "Cancelled");
                          setSelectedReservation({
                            ...selectedReservation,
                            status: "Cancelled",
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                  {selectedReservation.status === "Seated" && (
                    <button
                      onClick={() => {
                        updateStatus(selectedReservation.id, "Completed");
                        setSelectedReservation({
                          ...selectedReservation,
                          status: "Completed",
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </button>
                  )}
                  {selectedReservation.status === "No Show" && (
                    <button
                      onClick={() => {
                        addToBlacklist(selectedReservation);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Add to Blacklist
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {view === "list" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Today's Highlighted */}
          {todayReservations.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Today&apos;s Reservations ({todayReservations.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {todayReservations
                  .sort((a, b) => {
                    const timeA = TIME_SLOTS.indexOf(a.timeSlot);
                    const timeB = TIME_SLOTS.indexOf(b.timeSlot);
                    return timeA - timeB;
                  })
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReservation(r)}
                      className="bg-white rounded-lg px-3 py-2 text-sm shadow-sm border border-emerald-100 hover:shadow-md transition-shadow text-left"
                    >
                      <span className="font-medium text-gray-900">
                        {r.guestName}
                      </span>
                      <span className="text-gray-500 mx-1.5">|</span>
                      <span className="text-gray-600">{r.timeSlot}</span>
                      <span className="text-gray-500 mx-1.5">|</span>
                      <Users className="w-3 h-3 inline text-gray-400" />{" "}
                      <span className="text-gray-600">{r.partySize}</span>
                      <span className="text-gray-500 mx-1.5">|</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          statusColors[r.status]
                        }`}
                      >
                        {r.status}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ReservationStatus | "All")
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="All">All Statuses</option>
              {(
                [
                  "Pending",
                  "Confirmed",
                  "Seated",
                  "Completed",
                  "No Show",
                  "Cancelled",
                ] as ReservationStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reservations Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Guest
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Party
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Date & Time
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Table
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredReservations.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                          r.date === today ? "bg-emerald-50/30" : ""
                        }`}
                        onClick={() => setSelectedReservation(r)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {r.guestName}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {r.phone}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-gray-700">
                            <Users className="w-3.5 h-3.5 text-gray-400" />{" "}
                            {r.partySize}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <p>{r.date}</p>
                          <p className="text-xs text-gray-500">{r.timeSlot}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {r.tableAssigned}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            {r.tablePreference}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[r.status]
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReservation(r);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {filteredReservations.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reservations found</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {view === "calendar" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() =>
                  setCalendarMonth((prev) => {
                    const m = prev.month - 1;
                    return m < 0
                      ? { year: prev.year - 1, month: 11 }
                      : { ...prev, month: m };
                  })
                }
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {monthNames[calendarMonth.month]} {calendarMonth.year}
              </h3>
              <button
                onClick={() =>
                  setCalendarMonth((prev) => {
                    const m = prev.month + 1;
                    return m > 11
                      ? { year: prev.year + 1, month: 0 }
                      : { ...prev, month: m };
                  })
                }
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {renderCalendar()}
          </div>

          {/* Selected date reservations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Reservations for {selectedDate}
              {selectedDate === today && (
                <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </h3>
            {reservationsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                No reservations for this date
              </p>
            ) : (
              <div className="space-y-2">
                {reservationsForDate(selectedDate)
                  .sort(
                    (a, b) =>
                      TIME_SLOTS.indexOf(a.timeSlot) -
                      TIME_SLOTS.indexOf(b.timeSlot)
                  )
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReservation(r)}
                      className="w-full flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-emerald-700 w-20">
                          {r.timeSlot}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {r.guestName}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {r.partySize}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[r.status]
                        }`}
                      >
                        {r.status}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {view === "blacklist" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" /> No-Show Blacklist
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Guests with repeated no-show history
            </p>
          </div>
          {blacklist.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No blacklisted guests</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {blacklist.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-500">
                      {b.phone} &middot; {b.noShowCount} no-show(s) &middot;
                      Blacklisted {b.blacklistedAt}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromBlacklist(b.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {view === "settings" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5"
        >
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" /> Reservation Capacity
            Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Reservations per Time Slot
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={capacitySettings.maxPerSlot}
                onChange={(e) =>
                  setCapacitySettings((prev) => ({
                    ...prev,
                    maxPerSlot: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Limits how many bookings can be made for each time slot
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time Between Seatings (minutes)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={capacitySettings.bufferMinutes}
                onChange={(e) =>
                  setCapacitySettings((prev) => ({
                    ...prev,
                    bufferMinutes: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Time reserved between seatings for cleanup
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                SMS / Notification Reminders
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Send automated reminders before reservation time
              </p>
            </div>
            <button
              onClick={() =>
                setCapacitySettings((prev) => ({
                  ...prev,
                  smsReminders: !prev.smsReminders,
                }))
              }
              className="text-emerald-600"
            >
              {capacitySettings.smsReminders ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-400" />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
