"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  BedDouble,
  Users,
  Calendar,
  Check,
  X,
  Eye,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RoomType = "STANDARD" | "DELUXE" | "SUITE";
type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: RoomType;
  floor: number;
  price: number;
  maxGuests: number;
  description: string | null;
  amenities: string[];
  isAvailable: boolean;
  createdAt: string;
}

interface Booking {
  id: string;
  roomId: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  advanceAmount: number;
  totalAmount: number;
  note: string | null;
  status: BookingStatus;
  createdAt: string;
  room?: { roomNumber: string; name: string; type: RoomType };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROOM_TYPES: RoomType[] = ["STANDARD", "DELUXE", "SUITE"];

const ROOM_TYPE_COLORS: Record<RoomType, { bg: string; text: string; border: string }> = {
  STANDARD: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  DELUXE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  SUITE: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];

const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; border: string }> = {
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  CHECKED_IN: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CHECKED_OUT: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
};

const BLANK_ROOM = {
  roomNumber: "",
  name: "",
  type: "STANDARD" as RoomType,
  floor: 1,
  price: 0,
  maxGuests: 2,
  description: "",
  amenities: "",
  isAvailable: true,
};

const BLANK_BOOKING = {
  roomId: "",
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  checkIn: "",
  checkOut: "",
  guests: 1,
  advanceAmount: 0,
  totalAmount: 0,
  note: "",
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RoomManagementTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [activeTab, setActiveTab] = useState<"rooms" | "bookings">("rooms");

  if (!restaurant) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Room Management
            </h2>
          </div>
          <p className="mt-1.5 text-sm font-medium text-gray-500">
            Manage rooms &amp; bookings for{" "}
            <strong className="text-gray-900">{restaurant.name}</strong>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200/60 pb-px">
        <button
          onClick={() => setActiveTab("rooms")}
          className={`group flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-extrabold transition-all outline-none ${
            activeTab === "rooms"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <BedDouble className="h-4 w-4" />
          Rooms
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`group flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-extrabold transition-all outline-none ${
            activeTab === "bookings"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Bookings
        </button>
      </div>

      {activeTab === "rooms" ? (
        <RoomsView restaurantId={restaurant.id} currency={restaurant.currency} />
      ) : (
        <BookingsView restaurantId={restaurant.id} currency={restaurant.currency} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rooms View                                                         */
/* ------------------------------------------------------------------ */

function RoomsView({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(BLANK_ROOM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const data = await apiFetch<Room[]>(`/api/restaurants/${restaurantId}/rooms`);
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(BLANK_ROOM);
    setErrorMsg("");
    setShowForm(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber,
      name: room.name,
      type: room.type,
      floor: room.floor,
      price: room.price,
      maxGuests: room.maxGuests,
      description: room.description ?? "",
      amenities: room.amenities.join(", "),
      isAvailable: room.isAvailable,
    });
    setErrorMsg("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    setForm(BLANK_ROOM);
    setErrorMsg("");
  };

  const handleSave = async () => {
    if (!form.roomNumber.trim() || !form.name.trim() || form.price <= 0) {
      setErrorMsg("Room number, name, and a valid price are required.");
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const payload = {
      roomNumber: form.roomNumber.trim(),
      name: form.name.trim(),
      type: form.type,
      floor: form.floor,
      price: form.price,
      maxGuests: form.maxGuests,
      description: form.description.trim() || null,
      amenities: form.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      isAvailable: form.isAvailable,
    };

    try {
      if (editingRoom) {
        await apiFetch(`/api/restaurants/${restaurantId}/rooms/${editingRoom.id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await apiFetch(`/api/restaurants/${restaurantId}/rooms`, {
          method: "POST",
          body: payload,
        });
      }
      closeForm();
      await fetchRooms();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save room");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    setDeletingId(roomId);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/rooms/${roomId}`, {
        method: "DELETE",
      });
      await fetchRooms();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  /* Stats */
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.isAvailable).length;
  const occupiedRooms = totalRooms - availableRooms;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-gray-400">Loading rooms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Rooms", value: totalRooms, color: "text-gray-900" },
          { label: "Available", value: availableRooms, color: "text-emerald-600" },
          { label: "Occupied", value: occupiedRooms, color: "text-amber-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white/70 backdrop-blur-md border border-gray-100/50 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]"
          >
            <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Add Room button */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Room
        </button>
      </div>

      {/* Room cards */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BedDouble className="h-10 w-10 text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No rooms yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add your first room to start managing bookings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {rooms.map((room, i) => {
              const typeColors = ROOM_TYPE_COLORS[room.type];
              return (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-gray-100 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${typeColors.bg}`}
                  >
                    <BedDouble className={`h-5 w-5 ${typeColors.text}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 truncate">
                        #{room.roomNumber} &mdash; {room.name}
                      </h4>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}
                      >
                        {room.type}
                      </span>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          room.isAvailable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}
                      >
                        {room.isAvailable ? "Available" : "Occupied"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="font-semibold">
                        {formatPrice(room.price, currency)}/night
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Max {room.maxGuests}
                      </span>
                      <span>Floor {room.floor}</span>
                    </div>
                    {room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {room.amenities.slice(0, 5).map((a) => (
                          <span
                            key={a}
                            className="rounded-md bg-gray-50 border border-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
                          >
                            {a}
                          </span>
                        ))}
                        {room.amenities.length > 5 && (
                          <span className="text-[10px] font-medium text-gray-400">
                            +{room.amenities.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(room)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deletingId === room.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-40"
                      title="Delete"
                    >
                      {deletingId === room.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Room Form Modal */}
      <RoomFormModal
        open={showForm}
        onClose={closeForm}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
        errorMsg={errorMsg}
        isEditing={!!editingRoom}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Room Form Modal                                                    */
/* ------------------------------------------------------------------ */

function RoomFormModal({
  open,
  onClose,
  form,
  setForm,
  onSave,
  saving,
  errorMsg,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  form: typeof BLANK_ROOM;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_ROOM>>;
  onSave: () => void;
  saving: boolean;
  errorMsg: string;
  isEditing: boolean;
}) {
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
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.7 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#3e1e0c]">
                {isEditing ? "Edit Room" : "Add Room"}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Room Number & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Room Number <span className="text-[#eaa94d]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.roomNumber}
                    onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                    placeholder="e.g. 101"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Name <span className="text-[#eaa94d]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Mountain View"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-2">
                  Type <span className="text-[#eaa94d]">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROOM_TYPES.map((t) => {
                    const colors = ROOM_TYPE_COLORS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                          form.type === t
                            ? `${colors.bg} ${colors.text} ${colors.border}`
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Floor, Price, Max Guests */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Floor</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm((f) => ({ ...f, floor: parseInt(e.target.value) || 1 }))}
                    min={0}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Price/Night <span className="text-[#eaa94d]">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price || ""}
                    onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    min={0}
                    step={100}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Max Guests</label>
                  <input
                    type="number"
                    value={form.maxGuests}
                    onChange={(e) => setForm((f) => ({ ...f, maxGuests: parseInt(e.target.value) || 1 }))}
                    min={1}
                    max={20}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="A brief description of the room..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15 resize-none"
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Amenities{" "}
                  <span className="text-xs font-normal text-gray-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                  placeholder="e.g. WiFi, AC, TV, Mini Bar"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>

              {/* Availability toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    form.isAvailable ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition duration-200 ease-in-out ${
                      form.isAvailable ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-bold text-[#3e1e0c]">
                  {form.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-[#3e1e0c] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                  !saving
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20 hover:shadow-amber-500/30"
                    : "bg-gray-300 shadow-none cursor-not-allowed"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? "Saving..." : isEditing ? "Update Room" : "Add Room"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Bookings View                                                      */
/* ------------------------------------------------------------------ */

function BookingsView({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_BOOKING);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookingsData, roomsData] = await Promise.all([
        apiFetch<Booking[]>(`/api/restaurants/${restaurantId}/bookings`),
        apiFetch<Room[]>(`/api/restaurants/${restaurantId}/rooms`),
      ]);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch {
      setBookings([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm(BLANK_BOOKING);
    setErrorMsg("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(BLANK_BOOKING);
    setErrorMsg("");
  };

  const handleCreateBooking = async () => {
    if (!form.roomId || !form.guestName.trim() || !form.checkIn || !form.checkOut) {
      setErrorMsg("Room, guest name, check-in, and check-out are required.");
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      setErrorMsg("Check-out must be after check-in.");
      return;
    }
    setSaving(true);
    setErrorMsg("");

    try {
      await apiFetch(`/api/restaurants/${restaurantId}/bookings`, {
        method: "POST",
        body: {
          roomId: form.roomId,
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim() || null,
          guestEmail: form.guestEmail.trim() || null,
          checkIn: new Date(form.checkIn).toISOString(),
          checkOut: new Date(form.checkOut).toISOString(),
          guests: form.guests,
          advanceAmount: form.advanceAmount,
          totalAmount: form.totalAmount,
          note: form.note.trim() || null,
        },
      });
      closeForm();
      await fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    setUpdatingId(bookingId);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/bookings/${bookingId}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      await fetchData();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-gray-400">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar: filters + create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["ALL", ...BOOKING_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "All" : BOOKING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Booking
        </button>
      </div>

      {/* Bookings list */}
      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Calendar className="h-10 w-10 text-gray-300 mb-3" />
          <p className="font-bold text-gray-500">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === "ALL"
              ? "Create your first booking to get started"
              : `No ${BOOKING_STATUS_LABELS[statusFilter].toLowerCase()} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredBookings.map((booking, i) => {
              const statusColors = BOOKING_STATUS_COLORS[booking.status as BookingStatus];
              const roomInfo = booking.room ?? rooms.find((r) => r.id === booking.roomId);
              const isExpanded = expandedId === booking.id;

              return (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Guest avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 font-bold text-sm uppercase">
                      {booking.guestName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-gray-900 truncate">
                          {booking.guestName}
                        </h4>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                        >
                          {BOOKING_STATUS_LABELS[booking.status as BookingStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {roomInfo && (
                          <span className="font-semibold">
                            Room #{roomInfo.roomNumber} &mdash; {roomInfo.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span>
                          {new Date(booking.checkIn).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          &rarr;{" "}
                          {new Date(booking.checkOut).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="font-semibold text-gray-600">
                          {formatPrice(booking.totalAmount, currency)}
                        </span>
                        {booking.advanceAmount > 0 && (
                          <span className="text-emerald-600 font-semibold">
                            Adv: {formatPrice(booking.advanceAmount, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
                        title="Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Quick status buttons */}
                      {booking.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, "CHECKED_IN")}
                          disabled={updatingId === booking.id}
                          className="flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-emerald-700 hover:bg-emerald-100 transition-all text-xs font-bold disabled:opacity-40"
                          title="Check In"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Check In
                        </button>
                      )}
                      {booking.status === "CHECKED_IN" && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, "CHECKED_OUT")}
                          disabled={updatingId === booking.id}
                          className="flex h-8 items-center gap-1 rounded-lg bg-gray-100 px-2 text-gray-700 hover:bg-gray-200 transition-all text-xs font-bold disabled:opacity-40"
                          title="Check Out"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BedDouble className="h-3.5 w-3.5" />
                          )}
                          Check Out
                        </button>
                      )}
                      {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, "CANCELLED")}
                          disabled={updatingId === booking.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-40"
                          title="Cancel"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-50 px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          {booking.guestPhone && (
                            <div>
                              <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                Phone
                              </p>
                              <p className="font-bold text-gray-700">{booking.guestPhone}</p>
                            </div>
                          )}
                          {booking.guestEmail && (
                            <div>
                              <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                Email
                              </p>
                              <p className="font-bold text-gray-700 truncate">{booking.guestEmail}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                              Check-In
                            </p>
                            <p className="font-bold text-gray-700">
                              {new Date(booking.checkIn).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                              Check-Out
                            </p>
                            <p className="font-bold text-gray-700">
                              {new Date(booking.checkOut).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                              Total
                            </p>
                            <p className="font-bold text-gray-700">
                              {formatPrice(booking.totalAmount, currency)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                              Advance
                            </p>
                            <p className="font-bold text-gray-700">
                              {formatPrice(booking.advanceAmount, currency)}
                            </p>
                          </div>
                          {booking.note && (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                Note
                              </p>
                              <p className="font-medium text-gray-600">{booking.note}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Booking Form Modal */}
      <BookingFormModal
        open={showForm}
        onClose={closeForm}
        form={form}
        setForm={setForm}
        rooms={rooms}
        onSave={handleCreateBooking}
        saving={saving}
        errorMsg={errorMsg}
        currency={currency}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Form Modal                                                 */
/* ------------------------------------------------------------------ */

function BookingFormModal({
  open,
  onClose,
  form,
  setForm,
  rooms,
  onSave,
  saving,
  errorMsg,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  form: typeof BLANK_BOOKING;
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_BOOKING>>;
  rooms: Room[];
  onSave: () => void;
  saving: boolean;
  errorMsg: string;
  currency: string;
}) {
  const availableRooms = rooms.filter((r) => r.isAvailable);

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
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.7 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#3e1e0c]">New Booking</h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Room select */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Room <span className="text-[#eaa94d]">*</span>
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15 appearance-none"
                >
                  <option value="">Select a room</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      #{room.roomNumber} &mdash; {room.name} ({room.type}) &mdash;{" "}
                      {formatPrice(room.price, currency)}/night
                    </option>
                  ))}
                </select>
                {availableRooms.length === 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    No available rooms. Mark a room as available first.
                  </p>
                )}
              </div>

              {/* Guest Name */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                  Guest Name <span className="text-[#eaa94d]">*</span>
                </label>
                <input
                  type="text"
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="e.g. Sita Sharma"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.guestPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, guestPhone: e.target.value.replace(/[^\d+\-\s]/g, "") }))
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                    placeholder="guest@email.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Check-in & Check-out */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Check-In <span className="text-[#eaa94d]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.checkIn}
                    onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Check-Out <span className="text-[#eaa94d]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.checkOut}
                    onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Guests</label>
                <input
                  type="number"
                  value={form.guests}
                  onChange={(e) => setForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={20}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Advance Amount
                  </label>
                  <input
                    type="number"
                    value={form.advanceAmount || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, advanceAmount: parseFloat(e.target.value) || 0 }))
                    }
                    min={0}
                    step={100}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    value={form.totalAmount || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalAmount: parseFloat(e.target.value) || 0 }))
                    }
                    min={0}
                    step={100}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-bold text-[#3e1e0c] mb-1.5">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[#3e1e0c]/15 resize-none"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-[#3e1e0c] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                  !saving
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20 hover:shadow-amber-500/30"
                    : "bg-gray-300 shadow-none cursor-not-allowed"
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
