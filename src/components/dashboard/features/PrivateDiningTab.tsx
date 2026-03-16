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
  available: { label: "Available", color: "text-green-600", bg: "bg-green-50" },
  occupied: { label: "Occupied", color: "text-blue-600", bg: "bg-blue-50" },
  reserved: { label: "Reserved", color: "text-amber-600", bg: "bg-amber-50" },
  maintenance: { label: "Maintenance", color: "text-red-600", bg: "bg-red-50" },
};

const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
  active: { label: "Active", color: "text-green-600", bg: "bg-green-50" },
  completed: { label: "Completed", color: "text-gray-500", bg: "bg-gray-50" },
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-emerald-500" />
            Private Dining
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage private rooms, bookings, and set menus</p>
        </div>
        <button
          onClick={() => setShowCreateBooking(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: String(rooms.length), icon: DoorOpen, color: "#10B981" },
          { label: "Upcoming Bookings", value: String(upcomingBookings), icon: Calendar, color: "#3B82F6" },
          { label: "Available Now", value: String(rooms.filter((r) => r.status === "available").length), icon: Check, color: "#22C55E" },
          { label: "Revenue", value: formatPrice(totalRevenue, cur), icon: DollarSign, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-gray-500">{s.label}</span>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1.5">
        {(["bookings", "rooms", "menus"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all ${
              activeView === v ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {v === "menus" ? "Set Menus" : v}
          </button>
        ))}
      </div>

      {/* Create Booking Form */}
      <AnimatePresence>
        {showCreateBooking && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">New Booking</h3>
                <button onClick={() => setShowCreateBooking(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Room</label>
                  <select value={newBooking.roomId} onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400">
                    <option value="">Select room</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (up to {r.capacity})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Guest Name</label>
                  <input type="text" value={newBooking.guestName} onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })} placeholder="Name or company" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Party Size</label>
                  <input type="number" value={newBooking.partySize} onChange={(e) => setNewBooking({ ...newBooking, partySize: e.target.value })} placeholder="10" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Event Type</label>
                  <select value={newBooking.eventType} onChange={(e) => setNewBooking({ ...newBooking, eventType: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400">
                    {["Birthday", "Corporate", "Anniversary", "Wedding", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input type="date" value={newBooking.date} onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time</label>
                  <input type="time" value={newBooking.startTime} onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (hours)</label>
                  <input type="number" value={newBooking.duration} onChange={(e) => setNewBooking({ ...newBooking, duration: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Set Menu</label>
                  <select value={newBooking.menuType} onChange={(e) => setNewBooking({ ...newBooking, menuType: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400">
                    <option value="">A la carte</option>
                    {setMenus.map((m) => <option key={m.id} value={m.name}>{m.name} ({formatPrice(m.pricePerPerson, cur)}/person)</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Special Requests</label>
                <textarea value={newBooking.specialRequests} onChange={(e) => setNewBooking({ ...newBooking, specialRequests: e.target.value })} rows={2} placeholder="Decorations, setup requirements..." className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-emerald-400 resize-none" />
              </div>
              <div className="flex justify-end">
                <button onClick={handleCreateBooking} disabled={!newBooking.roomId || !newBooking.guestName || !newBooking.date} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:bg-gray-200 disabled:text-gray-400 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                  Create Booking
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookings View */}
      {activeView === "bookings" && (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const room = rooms.find((r) => r.id === booking.roomId);
            const bs = BOOKING_STATUS_CONFIG[booking.status];
            return (
              <motion.div key={booking.id} layout className="rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 shrink-0">
                    <DoorOpen className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{booking.guestName}</h3>
                      <span className={`text-[9px] font-bold ${bs.color} ${bs.bg} px-1.5 py-0.5 rounded`}>{bs.label}</span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{booking.eventType}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{room?.name ?? "Room"} · {booking.menuType || "A la carte"}</p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.startTime} ({booking.duration}h)</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{booking.partySize} guests</span>
                    </div>
                    {booking.specialRequests && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">"{booking.specialRequests}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(booking.totalEstimate, cur)}</p>
                    <p className="text-[10px] text-gray-400">Estimated</p>
                  </div>
                </div>
                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    {booking.status === "pending" && (
                      <button onClick={() => handleBookingStatus(booking.id, "confirmed")} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">Confirm</button>
                    )}
                    {booking.status === "confirmed" && (
                      <button onClick={() => handleBookingStatus(booking.id, "active")} className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all">Check In</button>
                    )}
                    <button onClick={() => handleBookingStatus(booking.id, "completed")} className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">Complete</button>
                  </div>
                )}
                {booking.status === "active" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button onClick={() => handleBookingStatus(booking.id, "completed")} className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all">Complete & Settle</button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rooms View */}
      {activeView === "rooms" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const rs = ROOM_STATUS_CONFIG[room.status];
            return (
              <motion.div key={room.id} layout className="rounded-xl bg-white ring-1 ring-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{room.name}</h3>
                    <span className={`text-[9px] font-bold ${rs.color} ${rs.bg} px-1.5 py-0.5 rounded`}>{rs.label}</span>
                  </div>
                  <button onClick={() => setShowConfigRoom(showConfigRoom === room.id ? null : room.id)} className="text-gray-400 hover:text-gray-600">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">{room.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[11px] text-gray-500"><Users className="h-3 w-3" />Up to {room.capacity}</span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500"><DollarSign className="h-3 w-3" />{formatPrice(room.hourlyRate, cur)}/hr</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {room.amenities.projector && <span className="flex items-center gap-1 text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500"><Projector className="h-2.5 w-2.5" />Projector</span>}
                  {room.amenities.sound && <span className="flex items-center gap-1 text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500"><Speaker className="h-2.5 w-2.5" />Sound</span>}
                  {room.amenities.tv && <span className="flex items-center gap-1 text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500"><Tv className="h-2.5 w-2.5" />TV</span>}
                  {room.amenities.whiteboard && <span className="flex items-center gap-1 text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500"><Monitor className="h-2.5 w-2.5" />Whiteboard</span>}
                </div>
                <p className="text-[10px] text-gray-400">Min spend: {formatPrice(room.minimumSpend, cur)}</p>

                <AnimatePresence>
                  {showConfigRoom === room.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                        <select
                          value={room.status}
                          onChange={(e) => handleRoomStatus(room.id, e.target.value as RoomStatus)}
                          className="w-full rounded-lg bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-200 outline-none focus:ring-emerald-400"
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

      {/* Set Menus View */}
      {activeView === "menus" && (
        <div className="space-y-4">
          {setMenus.map((menu) => (
            <div key={menu.id} className="rounded-xl bg-white ring-1 ring-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    {menu.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{menu.description}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{formatPrice(menu.pricePerPerson, cur)}/person</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {menu.items.map((item) => (
                  <span key={item} className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg ring-1 ring-emerald-100">
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
