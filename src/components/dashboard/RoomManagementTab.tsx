"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Loader2, BedDouble, Users, Calendar, Check, X, Eye, Upload, QrCode, Copy, ExternalLink, Download } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { uploadFile } from "@/lib/upload";
import QRCode from "react-qr-code";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "";

/*  Types                                                              */

type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: string;
  floor: string;
  price: number;
  maxGuests: number;
  description: string | null;
  amenities: string[];
  offerings: string[];
  locationNote: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  bedType: string | null;
  bedCount: number;
  isAvailable: boolean;
  qrUrl: string | null;
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
  nights: number;
  adults: number;
  children: number;
  advanceAmount: number;
  advancePaid: boolean;
  totalPrice: number;
  notes: string | null;
  status: BookingStatus;
  createdAt: string;
  room?: { roomNumber: string; name: string; type: string };
}

/*  Constants                                                          */

const ROOM_TYPES = ["NORMAL", "DELUXE", "SUITE", "OTHERS"];

const getRoomTypeColors = (type: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    NORMAL: { bg: "bg-[var(--canvas-sub)]", text: "text-[var(--text-2)]", border: "border-[var(--border)]" },
    DELUXE: { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]", border: "border-[var(--accent-border)]" },
    SUITE: { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]", border: "border-[var(--accent-border)]" },
    OTHERS: { bg: "bg-[var(--status-info-bg)]", text: "text-[var(--status-info-text)]", border: "border-[var(--status-info-border)]" },
  };
  return colors[type] || colors["OTHERS"];
};

const BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];

const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; border: string }> = {
  CONFIRMED: { bg: "bg-[var(--status-info-bg)]", text: "text-[var(--status-info-text)]", border: "border-[var(--status-info-border)]" },
  CHECKED_IN: { bg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]", border: "border-[var(--accent-border)]" },
  CHECKED_OUT: { bg: "bg-[var(--canvas-sub)]", text: "text-[var(--text-2)]", border: "border-[var(--border)]" },
  CANCELLED: { bg: "bg-[var(--status-error-bg)]", text: "text-[var(--status-error-text)]", border: "border-[var(--status-error-bg)]" },
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
};

const BED_TYPES = ["King", "Queen", "Twin", "Single", "Double", "Bunk Bed"];

// Curated amenities grouped by category for the quick-pick selector. Owners can
// still type any custom amenity that isn't listed here.
const AMENITY_CATALOG: { group: string; items: string[] }[] = [
  { group: "Comfort", items: ["WiFi", "Air Conditioning", "Heating", "TV", "Smart TV", "Mini Bar", "Work Desk", "Wardrobe", "Sofa", "Balcony"] },
  { group: "Bathroom", items: ["Private Bathroom", "Hot Water", "Bathtub", "Hair Dryer", "Toiletries", "Towels"] },
  { group: "Services", items: ["Room Service", "Daily Housekeeping", "Laundry", "Breakfast Included", "Airport Pickup", "Safe Locker"] },
  { group: "Views & Extras", items: ["Mountain View", "City View", "Garden View", "Lake View", "Pool Access", "Kitchenette", "Coffee Maker", "Pet Friendly", "Wheelchair Accessible", "Non-Smoking"] },
];

const ALL_AMENITIES = AMENITY_CATALOG.flatMap((g) => g.items);

const BLANK_ROOM = {
  roomNumber: "",
  name: "",
  type: "NORMAL",
  floor: "1",
  price: 0 as number | "",
  maxGuests: 2 as number | "",
  description: "",
  amenities: [] as string[],
  offerings: [] as string[],
  locationNote: "",
  imageUrls: [] as string[],
  videoUrl: "",
  bedType: "",
  bedCount: 1 as number | "",
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

/*  Main Component                                                     */

export default function RoomManagementTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const restaurant = selectedRestaurant ?? restaurants[0];
  const [activeTab, setActiveTab] = useState<"rooms" | "bookings">("rooms");

  if (!restaurant) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] w-fit">
        {(["rooms", "bookings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-bold capitalize transition-all",
              activeTab === t ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-1)]"
            )}
          >
            {t === "rooms" ? <BedDouble className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {activeTab === "rooms" ? (
        <RoomsView restaurantId={restaurant.id} currency={restaurant.currency} slug={restaurant.slug ?? ""} hotelName={restaurant.name} />
      ) : (
        <BookingsView restaurantId={restaurant.id} currency={restaurant.currency} />
      )}
    </div>
  );
}

/*  Rooms View                                                         */

function RoomsView({ restaurantId, currency, slug, hotelName }: { restaurantId: string; currency: string; slug: string; hotelName: string }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const roomsQueryKey = ["rooms", restaurantId] as const;
  const roomsQuery = useQuery({
    queryKey: roomsQueryKey,
    queryFn: () => apiFetch<Room[]>(`/api/restaurants/${restaurantId}/rooms`),
    enabled: !!restaurantId,
  });
  const rooms = roomsQuery.data ?? [];
  const setRooms = (updater: React.SetStateAction<Room[]>) =>
    queryClient.setQueryData<Room[]>(roomsQueryKey, (prev) =>
      typeof updater === "function" ? (updater as (p: Room[]) => Room[])(prev ?? []) : updater,
    );
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(BLANK_ROOM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showQrId, setShowQrId] = useState<string | null>(null);

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
      amenities: room.amenities ?? [],
      offerings: room.offerings ?? [],
      locationNote: room.locationNote ?? "",
      imageUrls: room.imageUrls ?? [],
      videoUrl: room.videoUrl ?? "",
      bedType: room.bedType ?? "",
      bedCount: room.bedCount ?? 1,
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
    const normalizedPrice = Number(form.price) || 0;
    if (!form.roomNumber.trim() || !form.name.trim() || normalizedPrice <= 0) {
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
      price: Number(form.price) || 0,
      maxGuests: Number(form.maxGuests) || 1,
      description: form.description.trim() || null,
      amenities: form.amenities.map((a) => a.trim()).filter(Boolean),
      offerings: form.offerings.map((o) => o.trim()).filter(Boolean),
      locationNote: form.locationNote.trim() || null,
      imageUrls: form.imageUrls,
      videoUrl: form.videoUrl.trim() || null,
      bedType: form.bedType.trim() || null,
      bedCount: Number(form.bedCount) || 1,
      isAvailable: form.isAvailable,
    };

    if (editingRoom) {
      // Optimistic edit: swap in place immediately, reconcile in background.
      const id = editingRoom.id;
      const snapshot = rooms;
      setRooms((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...payload } as Room) : r)));
      closeForm();
      try {
        const updated = await apiFetch<Room>(
          `/api/restaurants/${restaurantId}/rooms/${id}`,
          { method: "PATCH", body: payload },
        );
        setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      } catch (err) {
        setRooms(snapshot); // rollback
        showToast(err instanceof Error ? err.message : "Failed to update room", "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Optimistic create: show the room instantly with a temp id, then swap in
    // the real one (with its server-generated QR) when the POST returns.
    const tempId = `temp-${Date.now()}`;
    const tempRoom = {
      ...payload,
      id: tempId,
      qrUrl: null,
      createdAt: new Date().toISOString(),
    } as unknown as Room;
    setRooms((prev) => [tempRoom, ...prev]);
    closeForm();
    try {
      const created = await apiFetch<Room>(
        `/api/restaurants/${restaurantId}/rooms`,
        { method: "POST", body: payload },
      );
      setRooms((prev) => prev.map((r) => (r.id === tempId ? created : r)));
    } catch (err) {
      setRooms((prev) => prev.filter((r) => r.id !== tempId)); // rollback
      showToast(err instanceof Error ? err.message : "Failed to create room", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    const snapshot = rooms;
    setRooms((prev) => prev.filter((r) => r.id !== roomId)); // optimistic
    setDeletingId(roomId);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/rooms/${roomId}`, {
        method: "DELETE",
      });
    } catch {
      setRooms(snapshot); // rollback
      showToast("Failed to delete room", "error");
    } finally {
      setDeletingId(null);
    }
  };

  /* Stats */
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.isAvailable).length;
  const occupiedRooms = totalRooms - availableRooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 flex-1">
          <div className="rounded-2xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-2.5 sm:p-4 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">Total</p>
            <p className="text-[20px] sm:text-[28px] font-black text-[var(--text-1)] leading-none my-0.5">{totalRooms}</p>
            <p className="text-[9px] sm:text-[10px] text-[var(--text-3)]">rooms</p>
          </div>
          <div className="rounded-2xl bg-green-50 ring-1 ring-green-200 p-2.5 sm:p-4 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-green-700">Available</p>
            <p className="text-[20px] sm:text-[28px] font-black text-green-700 leading-none my-0.5">{availableRooms}</p>
            <p className="text-[9px] sm:text-[10px] text-green-600">rooms free</p>
          </div>
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-2.5 sm:p-4 flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-amber-700">Occupied</p>
            <p className="text-[20px] sm:text-[28px] font-black text-amber-700 leading-none my-0.5">{occupiedRooms}</p>
            <p className="text-[9px] sm:text-[10px] text-amber-600">rooms taken</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 sm:py-3 text-[13px] font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BedDouble className="h-10 w-10 text-[var(--text-3)] mb-3" />
          <p className="font-bold text-[var(--text-2)]">No rooms yet</p>
          <p className="text-sm text-[var(--text-3)] mt-1">Add your first room to start managing bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const isQrOpen = showQrId === room.id;
            return (
              <div
                key={room.id}
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--border)] transition-all group"
              >
                <div className="relative aspect-[4/3] bg-[var(--canvas-sub)]">
                  {room.imageUrls?.length > 0 ? (
                    <img src={room.imageUrls[0]} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BedDouble className="h-10 w-10 text-[var(--border)]" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-sm",
                      room.isAvailable ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {room.isAvailable ? "Available" : "Occupied"}
                    </span>
                    <span className="rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {room.type}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 flex h-8 min-w-[32px] items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm px-2">
                    <span className="text-[12px] font-black text-white">#{room.roomNumber}</span>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[14px] font-bold text-[var(--text-1)] leading-tight truncate">{room.name}</p>
                    <p className="text-[14px] font-black text-[var(--accent-text)] shrink-0 leading-tight">
                      {formatPrice(room.price, currency)}<span className="text-[10px] font-semibold text-[var(--text-3)]">/n</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] mb-2.5 flex-wrap">
                    <span>Floor {room.floor}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {room.maxGuests}</span>
                    {room.bedType && (
                      <><span>·</span><span className="flex items-center gap-0.5"><BedDouble className="h-3 w-3" /> {room.bedCount > 1 ? `${room.bedCount}× ` : ""}{room.bedType}</span></>
                    )}
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {room.amenities.slice(0, 4).map((a) => (
                        <span key={a} className="rounded-md bg-[var(--canvas-sub)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-3)]">{a}</span>
                      ))}
                      {room.amenities.length > 4 && <span className="text-[10px] text-[var(--text-3)] py-0.5">+{room.amenities.length - 4}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-soft)]">
                    <button
                      onClick={() => setShowQrId(isQrOpen ? null : room.id)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                        isQrOpen ? "bg-[var(--accent)] text-white" : "bg-[var(--canvas-sub)] text-[var(--text-3)] hover:text-[var(--accent-text)]"
                      )}
                      title="Room QR"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(room)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] text-[var(--text-3)] hover:text-[var(--accent-text)] transition-all"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deletingId === room.id}
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] text-[var(--text-3)] hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-40"
                      title="Delete"
                    >
                      {deletingId === room.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isQrOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-[var(--accent-border)] bg-[var(--accent-muted)]/20"
                    >
                      <RoomQRInline room={room} slug={slug} hotelName={hotelName} currency={currency} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

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

/*  Room Form Modal                                                    */

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
  const [uploadingImg, setUploadingImg] = useState(false);
  const [customAmenity, setCustomAmenity] = useState("");
  const imgInputRef = useRef<HTMLInputElement>(null);

  const toggleAmenity = (amenity: string) => {
    setForm((f) =>
      f.amenities.includes(amenity)
        ? { ...f, amenities: f.amenities.filter((a) => a !== amenity) }
        : { ...f, amenities: [...f.amenities, amenity] },
    );
  };

  const addCustomAmenity = () => {
    const value = customAmenity.trim();
    if (!value) return;
    setForm((f) =>
      f.amenities.some((a) => a.toLowerCase() === value.toLowerCase())
        ? f
        : { ...f, amenities: [...f.amenities, value] },
    );
    setCustomAmenity("");
  };

  // Custom amenities the owner typed that aren't part of the curated catalog.
  const extraAmenities = form.amenities.filter((a) => !ALL_AMENITIES.includes(a));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadFile(file, "rooms");
      setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, url] }));
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== idx) }));
  };

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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-black text-[var(--text-1)]">
                {isEditing ? "Edit Room" : "Add Room"}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--canvas-sub)] text-[var(--text-3)] hover:bg-[var(--surface)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Section 1: Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-black">1</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)]">Basic Info</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Room No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.roomNumber}
                        onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                        placeholder="e.g. 101"
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Mountain View"
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">Type</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {ROOM_TYPES.map((t) => {
                          const isCustom = !ROOM_TYPES.slice(0, 3).includes(form.type);
                          const isActive = t === "OTHERS" ? isCustom : form.type === t;
                          const colors = getRoomTypeColors(isActive ? form.type : t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, type: t === "OTHERS" ? "" : t }))}
                              className={cn("rounded-xl border px-3.5 py-2 text-[11px] font-bold transition-all",
                                isActive
                                  ? `${colors.bg} ${colors.text} ${colors.border}`
                                  : "border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-2)] hover:bg-[var(--surface)]"
                              )}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      {!ROOM_TYPES.slice(0, 3).includes(form.type) && (
                        <input
                          type="text"
                          value={form.type}
                          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                          placeholder="e.g. Treehouse, Tent..."
                          className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-3)] placeholder:font-normal"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)]" />

              {/* Section 2: Room Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-black">2</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)]">Room Details</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Floor</label>
                      <input
                        type="text"
                        value={form.floor}
                        onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                        placeholder="e.g. 1st, Ground, -1"
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center placeholder:text-[var(--text-3)] placeholder:font-normal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Price/Night <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
                        min={0}
                        step={100}
                        placeholder="0"
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Max Guests</label>
                      <input
                        type="number"
                        value={form.maxGuests}
                        onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value === "" ? "" : parseInt(e.target.value) || 1 }))}
                        min={1}
                        max={20}
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Bed Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BED_TYPES.map((bt) => (
                          <button
                            key={bt}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, bedType: f.bedType === bt ? "" : bt }))}
                            className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                              form.bedType === bt
                                ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                                : "border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-2)] hover:border-[var(--accent-border)] hover:text-[var(--accent-text)]"
                            )}
                          >
                            {bt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Bed Count</label>
                      <input
                        type="number"
                        value={form.bedCount}
                        onChange={(e) => setForm((f) => ({ ...f, bedCount: e.target.value === "" ? "" : parseInt(e.target.value) || 1 }))}
                        min={1}
                        max={10}
                        className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="A brief description of the room..."
                      rows={2}
                      className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] transition-all resize-none placeholder:text-[var(--text-3)] placeholder:font-normal"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)]" />

              {/* Section 3 header before amenities */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-black">3</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-3)]">Amenities &amp; Features</span>
              </div>

              {/* Amenities — categorized quick-pick + custom add */}
              <div>
                <div className="flex items-center justify-end mb-2">
                  {form.amenities.length > 0 && (
                    <span className="text-[11px] font-bold text-[var(--accent-text)]">
                      {form.amenities.length} selected
                    </span>
                  )}
                </div>
                <div className="space-y-3 rounded-xl ring-1 ring-[var(--border)] bg-[var(--canvas-sub)] p-3">
                  {AMENITY_CATALOG.map((group) => (
                    <div key={group.group}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1.5">
                        {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => {
                          const active = form.amenities.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleAmenity(item)}
                              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                                active
                                  ? "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                                  : "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-2)] hover:border-[var(--accent-border)] hover:text-[var(--accent-text)]"
                              }`}
                            >
                              {active && <Check className="h-3 w-3" strokeWidth={3} />}
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Custom amenities the owner added */}
                  {extraAmenities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1.5">
                        Custom
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {extraAmenities.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAmenity(item)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-text)] transition-all"
                          >
                            {item}
                            <X className="h-3 w-3" strokeWidth={3} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add a custom amenity */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomAmenity();
                        }
                      }}
                      placeholder="Add a custom amenity…"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-xs font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                    />
                    <button
                      type="button"
                      onClick={addCustomAmenity}
                      disabled={!customAmenity.trim()}
                      className="flex items-center gap-1 rounded-lg bg-[var(--text-1)] px-3 py-2 text-xs font-bold text-[var(--canvas)] transition-all hover:opacity-90 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)]" />

              {/* Room Photos */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-1)] mb-3 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-black">4</span>
                  Room Photos
                </label>
                
                <div className="rounded-2xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)]/20 p-5 text-center">
                  {form.imageUrls.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      {form.imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group h-24 w-24 rounded-xl overflow-hidden border-2 border-[var(--border)] shrink-0 shadow-sm">
                          <img src={url} alt={`Room ${idx + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-5 w-5 text-white" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold bg-black/70 text-white py-0.5">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploadingImg}
                    className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-[13px] font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    {uploadingImg ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Add Photo</>
                    )}
                  </button>
                  <p className="text-[10px] font-semibold text-[var(--text-3)] mt-2">
                    {form.imageUrls.length === 0 ? "Upload at least one photo" : "You can add more photos"}
                  </p>
                </div>
              </div>

              {/* Room video (optional) */}
              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Video Tour URL{" "}
                  <span className="text-xs font-normal text-[var(--text-3)]">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    form.isAvailable ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--surface)] shadow-lg transform transition duration-200 ease-in-out ${
                      form.isAvailable ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-bold text-[var(--text-1)]">
                  {form.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="mt-4 rounded-xl bg-[var(--status-error-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--status-error-text)]">
                {errorMsg}
              </p>
            )}

            <div className="mt-5 space-y-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-[14px] font-black text-white shadow-md hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Room"}
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/*  Bookings View                                                      */

function BookingsView({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const queryClient = useQueryClient();
  const bookingsQueryKey = ["room-bookings", restaurantId] as const;
  const roomsQueryKey = ["rooms", restaurantId] as const; // shared cache key with RoomsView
  const bookingsQuery = useQuery({
    queryKey: bookingsQueryKey,
    queryFn: async () => {
      const bData = await apiFetch<{ bookings?: Booking[] } | Booking[]>(
        `/api/restaurants/${restaurantId}/bookings?limit=100`,
      );
      return Array.isArray(bData) ? bData : bData.bookings ?? [];
    },
    enabled: !!restaurantId,
  });
  const bookings = bookingsQuery.data ?? [];
  const roomsQuery = useQuery({
    queryKey: roomsQueryKey,
    queryFn: () => apiFetch<Room[]>(`/api/restaurants/${restaurantId}/rooms`),
    enabled: !!restaurantId,
  });
  const rooms = roomsQuery.data ?? [];
  const loading = bookingsQuery.isLoading || roomsQuery.isLoading;
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_BOOKING);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const createBookingMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/restaurants/${restaurantId}/bookings`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
      queryClient.invalidateQueries({ queryKey: roomsQueryKey });
    },
  });

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
      await createBookingMutation.mutateAsync({
        roomId: form.roomId,
        guestName: form.guestName.trim(),
        guestPhone: form.guestPhone.trim() || null,
        guestEmail: form.guestEmail.trim() || null,
        checkIn: new Date(form.checkIn).toISOString(),
        checkOut: new Date(form.checkOut).toISOString(),
        adults: form.guests,
        advanceAmount: form.advanceAmount,
        notes: form.note.trim() || null,
      });
      closeForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  // Optimistic status flip — the row updates instantly instead of waiting on
  // a round-trip that used to re-fetch both bookings AND rooms. Rolled back
  // on failure; rooms invalidated on settle since availability may change.
  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      apiFetch(`/api/restaurants/${restaurantId}/bookings/${id}`, {
        method: "PATCH",
        body: { status },
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: bookingsQueryKey });
      const previous = queryClient.getQueryData<Booking[]>(bookingsQueryKey);
      queryClient.setQueryData<Booking[]>(bookingsQueryKey, (prev) =>
        (prev ?? []).map((b) => (b.id === id ? { ...b, status } : b)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsQueryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey });
    },
  });
  const updatingId = updateBookingStatusMutation.isPending
    ? (updateBookingStatusMutation.variables?.id ?? null)
    : null;

  const handleStatusUpdate = (bookingId: string, newStatus: BookingStatus) => {
    updateBookingStatusMutation.mutate({ id: bookingId, status: newStatus });
  };

  const filteredBookings =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--canvas-sub)] ring-1 ring-[var(--border)] overflow-x-auto scrollbar-hide">
          {(["ALL", ...BOOKING_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                statusFilter === s ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-1)]"
              )}
            >
              {s === "ALL" ? "All" : BOOKING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Booking
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Calendar className="h-10 w-10 text-[var(--text-3)] mb-3" />
          <p className="font-bold text-[var(--text-2)]">No bookings found</p>
          <p className="text-sm text-[var(--text-3)] mt-1">
            {statusFilter === "ALL"
              ? "Create your first booking to get started"
              : `No ${BOOKING_STATUS_LABELS[statusFilter].toLowerCase()} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Default AnimatePresence mode (not popLayout). popLayout wraps every
           * child in framer-motion's PopChild/PopChildMeasure, which measures and
           * reflows each card — visible jank in devtools and on screen. The cards
           * still animate via `layout` on the motion.div below; they just don't
           * pay the pop-measure cost. */}
          <AnimatePresence>
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
                  className="rounded-2xl bg-[var(--canvas)]/90 backdrop-blur-xl border border-[var(--border-soft)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-[var(--accent-text)] font-bold text-sm uppercase">
                      {booking.guestName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[var(--text-1)] truncate">
                          {booking.guestName}
                        </h4>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                        >
                          {BOOKING_STATUS_LABELS[booking.status as BookingStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-2)]">
                        {roomInfo && (
                          <span className="font-semibold">
                            Room #{roomInfo.roomNumber} &mdash; {roomInfo.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.adults + booking.children} guest{(booking.adults + booking.children) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-3)]">
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
                        <span className="font-semibold text-[var(--text-2)]">
                          {formatPrice(booking.totalPrice, currency)}
                        </span>
                        {booking.advanceAmount > 0 && (
                          <span className="text-[var(--accent-text)] font-semibold">
                            Adv: {formatPrice(booking.advanceAmount, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] text-[var(--text-2)] hover:bg-[var(--surface)] transition-all"
                        title="Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {booking.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, "CHECKED_IN")}
                          disabled={updatingId === booking.id}
                          className="flex h-8 items-center gap-1 rounded-lg bg-[var(--accent-muted)] px-2 text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-all text-xs font-bold disabled:opacity-40"
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
                          className="flex h-8 items-center gap-1 rounded-lg bg-[var(--surface)] px-2 text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-all text-xs font-bold disabled:opacity-40"
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--status-error-bg)] text-[var(--status-error-text)] hover:brightness-110 transition-all disabled:opacity-40"
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

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--border-soft)] px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          {booking.guestPhone && (
                            <div>
                              <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                                Phone
                              </p>
                              <p className="font-bold text-[var(--text-2)]">{booking.guestPhone}</p>
                            </div>
                          )}
                          {booking.guestEmail && (
                            <div>
                              <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                                Email
                              </p>
                              <p className="font-bold text-[var(--text-2)] truncate">{booking.guestEmail}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                              Check-In
                            </p>
                            <p className="font-bold text-[var(--text-2)]">
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
                            <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                              Check-Out
                            </p>
                            <p className="font-bold text-[var(--text-2)]">
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
                            <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                              Total
                            </p>
                            <p className="font-bold text-[var(--text-2)]">
                              {formatPrice(booking.totalPrice, currency)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                              Advance
                            </p>
                            <p className="font-bold text-[var(--text-2)]">
                              {formatPrice(booking.advanceAmount, currency)}
                            </p>
                          </div>
                          {booking.notes && (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">
                                Notes
                              </p>
                              <p className="font-medium text-[var(--text-2)]">{booking.notes}</p>
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

/*  Booking Form Modal                                                 */

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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl sm:p-8 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[var(--text-1)]">New Booking</h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-3)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-2)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Room <span className="text-[var(--accent)]">*</span>
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15 appearance-none"
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
                  <p className="mt-1 text-xs font-medium text-[var(--accent-text)]">
                    No available rooms. Mark a room as available first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                  Guest Name <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="e.g. Sita Sharma"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Phone <span className="text-[var(--accent)]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.guestPhone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        guestPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    required
                    maxLength={10}
                    minLength={10}
                    pattern="\d{10}"
                    inputMode="numeric"
                    title="Enter exactly 10 digits"
                    placeholder="98XXXXXXXX"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                    placeholder="guest@email.com"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
              </div>

              {/* Check-in & Check-out */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Check-In <span className="text-[var(--accent)]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.checkIn}
                    onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
                    Check-Out <span className="text-[var(--accent)]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.checkOut}
                    onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">Guests</label>
                <input
                  type="number"
                  value={form.guests}
                  onChange={(e) => setForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={20}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
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
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">
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
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-1)] mb-1.5">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 outline-none transition-all focus:border-[#3e1e0c] focus:ring-2 focus:ring-[var(--text-1)]/15 resize-none"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="mt-4 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-bg)] px-4 py-2.5 text-sm font-medium text-[var(--status-error-text)]">
                {errorMsg}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--canvas-sub)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                  !saving
                    ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-[var(--accent)]/20/20 hover:shadow-[var(--accent)]/20/30"
                    : "bg-[var(--border)] shadow-none cursor-not-allowed"
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

/*  Room QR Inline Panel                                               */

function RoomQRInline({
  room,
  slug,
  hotelName,
  currency,
}: {
  room: Room;
  slug: string;
  hotelName: string;
  currency: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Prefer the server-persisted unique path; fall back to computing it. Both are
  // restaurant-specific (slug) + room-specific (roomNumber).
  const roomPath =
    room.qrUrl || (slug ? `/hotel/${slug}/room/${encodeURIComponent(room.roomNumber)}` : "");
  const roomUrl = roomPath ? `${APP_URL}${roomPath}` : "";
  const roomLabel = room.name || `Room ${room.roomNumber}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const CARD_W = 360, CARD_H = 480;
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    ctx.fillStyle = "#FFFBF0";
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 20);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    grad.addColorStop(0, "#f59e0b");
    grad.addColorStop(1, "#ea580c");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, CARD_W, 64, { tl: 20, tr: 20, bl: 0, br: 0 });
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hotelName, CARD_W / 2, 24);
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(roomLabel, CARD_W / 2, 46);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`Room #${room.roomNumber} · Floor ${room.floor} · ${room.type}`, CARD_W / 2, 60);

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    });
    const QR_SIZE = 190;
    const qrX = (CARD_W - QR_SIZE) / 2;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrX - 14, 76, QR_SIZE + 28, QR_SIZE + 28, 14);
    ctx.fill();
    ctx.drawImage(img, qrX, 90, QR_SIZE, QR_SIZE);

    ctx.fillStyle = "#92400e";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    const details: string[] = [];
    if (room.bedType) details.push(`${room.bedCount > 1 ? `${room.bedCount}x ` : ""}${room.bedType}`);
    if (room.maxGuests) details.push(`Up to ${room.maxGuests} guest${room.maxGuests === 1 ? "" : "s"}`);
    if (details.length) ctx.fillText(details.join(" · "), CARD_W / 2, 336);
    ctx.fillText(formatPrice(room.price, currency) + "/night", CARD_W / 2, 354);

    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 370);
    ctx.lineTo(CARD_W - 36, 370);
    ctx.stroke();

    ctx.fillStyle = "#d97706";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillText("Powered by HimaVolt", CARD_W / 2, 390);
    ctx.fillStyle = "#a16207";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Scan to view, book, or order to this room", CARD_W / 2, 406);

    const link = document.createElement("a");
    link.download = `room-${room.roomNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 px-4 pb-4 pt-3">
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div ref={qrRef} className="rounded-xl bg-[var(--surface)] p-2.5 ring-1 ring-[var(--accent-border)] shadow-sm">
          {roomUrl ? (
            <QRCode value={roomUrl} size={110} level="M" />
          ) : (
            <div className="flex h-[110px] w-[110px] items-center justify-center">
              <QrCode className="h-10 w-10 text-[var(--text-3)]" />
            </div>
          )}
        </div>
        <span className="text-[9px] font-semibold text-[var(--text-3)]">Room {room.roomNumber}</span>
      </div>

      <div className="flex-1 space-y-2 py-0.5">
        <p className="text-[13px] font-bold text-[var(--text-1)]">{roomLabel}</p>
        <p className="text-[10px] font-mono text-[var(--text-3)] break-all">
          {roomUrl.replace(/^https?:\/\//, "")}
        </p>
        <p className="text-[11px] text-[var(--text-2)]">
          Guests scan to browse this room, book it, or order food &amp; drinks during their stay.
        </p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
          >
            {downloaded ? (
              <><Check className="h-3 w-3" /> Downloaded!</>
            ) : (
              <><Download className="h-3 w-3" /> Download PNG</>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--canvas)] ring-1 ring-[var(--border)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-all"
          >
            {copied ? (
              <><Check className="h-3 w-3 text-[var(--accent-text)]" /> Copied!</>
            ) : (
              <><Copy className="h-3 w-3" /> Copy URL</>
            )}
          </button>
          <a
            href={roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[var(--status-info-bg)] ring-1 ring-[var(--status-info-border)] px-3 py-1.5 text-[11px] font-bold text-[var(--status-info-text)] hover:brightness-110 transition-all"
          >
            <ExternalLink className="h-3 w-3" /> Preview
          </a>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/*  Canvas helper                                                      */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; bl: number; br: number },
) {
  const radii = typeof r === "number" ? { tl: r, tr: r, bl: r, br: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + w - radii.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
  ctx.lineTo(x + w, y + h - radii.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
  ctx.lineTo(x + radii.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.quadraticCurveTo(x, y, x + radii.tl, y);
  ctx.closePath();
}
