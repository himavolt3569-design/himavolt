"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  DoorOpen,
  Plus,
  Calendar,
  Clock,
  Users,
  X,
  Settings,
  Monitor,
  Speaker,
  Tv,
  Projector,
  DollarSign,
  User,
  Star,
  Check,
} from "lucide-react";

type RoomStatus = "available" | "occupied" | "reserved" | "maintenance";
type BookingStatus = "pending" | "confirmed" | "active" | "completed";

interface DiningRoom {
  id: string;
  name: string;
  capacity: number;
  hourlyRate: number;
  minimumSpend: number;
  amenities: { projector: boolean; sound: boolean; tv: boolean; whiteboard: boolean };
  status: RoomStatus;
  description: string;
}

interface RoomBooking {
  id: string;
  roomId: string;
  guestName: string;
  partySize: number;
  date: string;
  startTime: string;
  duration: number;
  eventType: string;
  menuType: string;
  specialRequests: string;
  status: BookingStatus;
  totalEstimate: number;
}

interface SetMenu {
  id: string;
  name: string;
  pricePerPerson: number;
  items: string[];
  description: string;
}

const ROOM_STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]" },
  occupied: { label: "Occupied", color: "text-blue-600", bg: "bg-blue-50" },
  reserved: { label: "Reserved", color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]" },
  maintenance: { label: "Maintenance", color: "text-red-600", bg: "bg-red-50" },
};

const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]" },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
  active: { label: "Active", color: "text-[var(--accent-text)]", bg: "bg-[var(--accent-muted)]" },
  completed: { label: "Completed", color: "text-[var(--text-2)]", bg: "bg-[var(--canvas-sub)]" },
};

export default function PrivateDiningTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [rooms, setRooms] = useState<DiningRoom[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [setMenus] = useState<SetMenu[]>([]);
  const [activeView, setActiveView] = useState<"rooms" | "bookings" | "menus">("bookings");
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showConfigRoom, setShowConfigRoom] = useState<string | null>(null);

  const [newBooking, setNewBooking] = useState({
    roomId: "", guestName: "", partySize: "", date: "", startTime: "", duration: "3",
    eventType: "Birthday", menuType: "", specialRequests: "",
  });

  const totalRevenue = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + b.totalEstimate, 0);
  const upcomingBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending").length;

  const handleCreateBooking = () => {
    if (!newBooking.roomId || !newBooking.guestName || !newBooking.date) return;
    const room = rooms.find((r) => r.id === newBooking.roomId);
    const menu = setMenus.find((m) => m.name === newBooking.menuType);
    const partySize = parseInt(newBooking.partySize) || 10;
    const hours = parseInt(newBooking.duration) || 3;
    const estimate = (menu ? menu.pricePerPerson * partySize : 0) + (room ? room.hourlyRate * hours : 0);

    setBookings((prev) => [
      ...prev,
      {
        id: `b${Date.now()}`,
        roomId: newBooking.roomId,
        guestName: newBooking.guestName,
        partySize,
        date: newBooking.date,
        startTime: newBooking.startTime,
        duration: hours,
        eventType: newBooking.eventType,
        menuType: newBooking.menuType,
        specialRequests: newBooking.specialRequests,
        status: "pending",
        totalEstimate: estimate,
      },
    ]);
    setNewBooking({ roomId: "", guestName: "", partySize: "", date: "", startTime: "", duration: "3", eventType: "Birthday", menuType: "", specialRequests: "" });
    setShowCreateBooking(false);
  };

  const handleBookingStatus = (id: string, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  const handleRoomStatus = (id: string, status: RoomStatus) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-[var(--accent-hover)]" />
            Private Dining
          </h2>
          <p className="text-sm text-[var(--text-2)] mt-1">Manage private rooms, bookings, and set menus</p>
        </div>
        <button
          onClick={() => setShowCreateBooking(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent)] transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: String(rooms.length), icon: DoorOpen, color: "#10B981" },
          { label: "Upcoming Bookings", value: String(upcomingBookings), icon: Calendar, color: "#3B82F6" },
          { label: "Available Now", value: String(rooms.filter((r) => r.status === "available").length), icon: Check, color: "#22C55E" },
          { label: "Revenue", value: formatPrice(totalRevenue, cur), icon: DollarSign, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[var(--text-2)]">{s.label}</span>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-lg font-bold text-[var(--text-1)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(["bookings", "rooms", "menus"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all ${
              activeView === v ? "bg-[var(--accent-muted)] text-[var(--accent-text)]" : "bg-[var(--canvas-sub)] text-[var(--text-2)] hover:bg-[var(--surface)]"
            }`}
          >
            {v === "menus" ? "Set Menus" : v}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showCreateBooking && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-1)]">New Booking</h3>
                <button onClick={() => setShowCreateBooking(false)} className="text-[var(--text-3)] hover:text-[var(--text-2)]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Room</label>
                  <select value={newBooking.roomId} onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]">
                    <option value="">Select room</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (up to {r.capacity})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Guest Name</label>
                  <input type="text" value={newBooking.guestName} onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })} placeholder="Name or company" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Party Size</label>
                  <input type="number" value={newBooking.partySize} onChange={(e) => setNewBooking({ ...newBooking, partySize: e.target.value })} placeholder="10" className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Event Type</label>
                  <select value={newBooking.eventType} onChange={(e) => setNewBooking({ ...newBooking, eventType: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]">
                    {["Birthday", "Corporate", "Anniversary", "Wedding", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Date</label>
                  <input type="date" value={newBooking.date} onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Start Time</label>
                  <input type="time" value={newBooking.startTime} onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Duration (hours)</label>
                  <input type="number" value={newBooking.duration} onChange={(e) => setNewBooking({ ...newBooking, duration: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Set Menu</label>
                  <select value={newBooking.menuType} onChange={(e) => setNewBooking({ ...newBooking, menuType: e.target.value })} className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]">
                    <option value="">A la carte</option>
                    {setMenus.map((m) => <option key={m.id} value={m.name}>{m.name} ({formatPrice(m.pricePerPerson, cur)}/person)</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Special Requests</label>
                <textarea value={newBooking.specialRequests} onChange={(e) => setNewBooking({ ...newBooking, specialRequests: e.target.value })} rows={2} placeholder="Decorations, setup requirements..." className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2.5 text-sm ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)] resize-none" />
              </div>
              <div className="flex justify-end">
                <button onClick={handleCreateBooking} disabled={!newBooking.roomId || !newBooking.guestName || !newBooking.date} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)] disabled:bg-[var(--surface-alt)] disabled:text-[var(--text-3)] transition-all">
                  <Plus className="h-3.5 w-3.5" />
                  Create Booking
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeView === "bookings" && (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const room = rooms.find((r) => r.id === booking.roomId);
            const bs = BOOKING_STATUS_CONFIG[booking.status];
            return (
              <motion.div key={booking.id} layout className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-muted)] shrink-0">
                    <DoorOpen className="h-5 w-5 text-[var(--accent-hover)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[var(--text-1)]">{booking.guestName}</h3>
                      <span className={`text-[9px] font-bold ${bs.color} ${bs.bg} px-1.5 py-0.5 rounded`}>{bs.label}</span>
                      <span className="text-[9px] bg-[var(--surface)] text-[var(--text-2)] px-1.5 py-0.5 rounded">{booking.eventType}</span>
                    </div>
                    <p className="text-xs text-[var(--text-2)] mb-1">{room?.name ?? "Room"} · {booking.menuType || "A la carte"}</p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text-3)]">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.startTime} ({booking.duration}h)</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{booking.partySize} guests</span>
                    </div>
                    {booking.specialRequests && (
                      <p className="text-[11px] text-[var(--text-3)] mt-1 italic">"{booking.specialRequests}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[var(--text-1)]">{formatPrice(booking.totalEstimate, cur)}</p>
                    <p className="text-[10px] text-[var(--text-3)]">Estimated</p>
                  </div>
                </div>
                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-soft)]">
                    {booking.status === "pending" && (
                      <button onClick={() => handleBookingStatus(booking.id, "confirmed")} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">Confirm</button>
                    )}
                    {booking.status === "confirmed" && (
                      <button onClick={() => handleBookingStatus(booking.id, "active")} className="text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent-muted)] px-3 py-1.5 rounded-lg hover:bg-[var(--accent-muted)] transition-all">Check In</button>
                    )}
                    <button onClick={() => handleBookingStatus(booking.id, "completed")} className="text-xs font-semibold text-[var(--text-2)] bg-[var(--canvas-sub)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-all">Complete</button>
                  </div>
                )}
                {booking.status === "active" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-soft)]">
                    <button onClick={() => handleBookingStatus(booking.id, "completed")} className="text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent-muted)] px-3 py-1.5 rounded-lg hover:bg-[var(--accent-muted)] transition-all">Complete & Settle</button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {activeView === "rooms" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const rs = ROOM_STATUS_CONFIG[room.status];
            return (
              <motion.div key={room.id} layout className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-1)]">{room.name}</h3>
                    <span className={`text-[9px] font-bold ${rs.color} ${rs.bg} px-1.5 py-0.5 rounded`}>{rs.label}</span>
                  </div>
                  <button onClick={() => setShowConfigRoom(showConfigRoom === room.id ? null : room.id)} className="text-[var(--text-3)] hover:text-[var(--text-2)]">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-2)] mb-3">{room.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-2)]"><Users className="h-3 w-3" />Up to {room.capacity}</span>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-2)]"><DollarSign className="h-3 w-3" />{formatPrice(room.hourlyRate, cur)}/hr</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {room.amenities.projector && <span className="flex items-center gap-1 text-[10px] bg-[var(--canvas-sub)] px-2 py-0.5 rounded text-[var(--text-2)]"><Projector className="h-2.5 w-2.5" />Projector</span>}
                  {room.amenities.sound && <span className="flex items-center gap-1 text-[10px] bg-[var(--canvas-sub)] px-2 py-0.5 rounded text-[var(--text-2)]"><Speaker className="h-2.5 w-2.5" />Sound</span>}
                  {room.amenities.tv && <span className="flex items-center gap-1 text-[10px] bg-[var(--canvas-sub)] px-2 py-0.5 rounded text-[var(--text-2)]"><Tv className="h-2.5 w-2.5" />TV</span>}
                  {room.amenities.whiteboard && <span className="flex items-center gap-1 text-[10px] bg-[var(--canvas-sub)] px-2 py-0.5 rounded text-[var(--text-2)]"><Monitor className="h-2.5 w-2.5" />Whiteboard</span>}
                </div>
                <p className="text-[10px] text-[var(--text-3)]">Min spend: {formatPrice(room.minimumSpend, cur)}</p>

                <AnimatePresence>
                  {showConfigRoom === room.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                        <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Status</label>
                        <select
                          value={room.status}
                          onChange={(e) => handleRoomStatus(room.id, e.target.value as RoomStatus)}
                          className="w-full rounded-lg bg-[var(--canvas-sub)] px-3 py-2 text-xs ring-1 ring-[var(--border)] outline-none focus:ring-[var(--accent)]"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="reserved">Reserved</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeView === "menus" && (
        <div className="space-y-4">
          {setMenus.map((menu) => (
            <div key={menu.id} className="rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                    <Star className="h-4 w-4 text-[var(--accent)]" />
                    {menu.name}
                  </h3>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">{menu.description}</p>
                </div>
                <span className="text-sm font-bold text-[var(--accent-text)]">{formatPrice(menu.pricePerPerson, cur)}/person</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {menu.items.map((item) => (
                  <span key={item} className="text-[11px] bg-[var(--accent-muted)] text-[var(--accent-text)] px-2.5 py-1 rounded-lg ring-1 ring-[var(--accent-border)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
