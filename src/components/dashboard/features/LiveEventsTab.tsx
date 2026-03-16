"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Music,
  Plus,
  Calendar,
  Clock,
  Users,
  DollarSign,
  X,
  Mic2,
  Radio,
  Headphones,
  Laugh,
  Tv,
  Star,
  MapPin,
  Ticket,
} from "lucide-react";

type EventType = "live-band" | "dj-night" | "karaoke" | "comedy" | "open-mic" | "sports";
type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

interface BarEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  performer: string;
  coverCharge: number;
  capacity: number;
  ticketsSold: number;
  status: EventStatus;
  description: string;
  recurring: boolean;
  revenue: number;
}

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: typeof Music; color: string; bg: string }> = {
  "live-band": { label: "Live Band", icon: Music, color: "text-rose-500", bg: "bg-rose-50" },
  "dj-night": { label: "DJ Night", icon: Headphones, color: "text-purple-500", bg: "bg-purple-50" },
  "karaoke": { label: "Karaoke", icon: Mic2, color: "text-pink-500", bg: "bg-pink-50" },
  "comedy": { label: "Comedy Night", icon: Laugh, color: "text-amber-500", bg: "bg-amber-50" },
  "open-mic": { label: "Open Mic", icon: Radio, color: "text-blue-500", bg: "bg-blue-50" },
  "sports": { label: "Sports Screening", icon: Tv, color: "text-green-500", bg: "bg-green-50" },
};

const STATUS_COLORS: Record<EventStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: "Upcoming", color: "text-blue-600", bg: "bg-blue-50" },
  ongoing: { label: "Ongoing", color: "text-green-600", bg: "bg-green-50" },
  completed: { label: "Completed", color: "text-gray-500", bg: "bg-gray-50" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
};

export default function LiveEventsTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [events, setEvents] = useState<BarEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<EventStatus | "all">("all");
  const [newEvent, setNewEvent] = useState({
    name: "", type: "live-band" as EventType, date: "", startTime: "", endTime: "",
    performer: "", coverCharge: "", capacity: "", description: "", recurring: false,
  });

  const filtered = events.filter((e) => filter === "all" || e.status === filter);

  const todayEvent = events.find(
    (e) => e.date === new Date().toISOString().split("T")[0] && e.status !== "cancelled",
  );

  const totalUpcoming = events.filter((e) => e.status === "upcoming").length;
  const totalRevenue = events.reduce((s, e) => s + e.revenue, 0);

  const handleCreate = () => {
    if (!newEvent.name || !newEvent.date || !newEvent.startTime) return;
    setEvents((prev) => [
      ...prev,
      {
        id: `e${Date.now()}`,
        name: newEvent.name,
        type: newEvent.type,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        performer: newEvent.performer,
        coverCharge: parseFloat(newEvent.coverCharge) || 0,
        capacity: parseInt(newEvent.capacity) || 50,
        ticketsSold: 0,
        status: "upcoming",
        description: newEvent.description,
        recurring: newEvent.recurring,
        revenue: 0,
      },
    ]);
    setNewEvent({ name: "", type: "live-band", date: "", startTime: "", endTime: "", performer: "", coverCharge: "", capacity: "", description: "", recurring: false });
    setShowCreate(false);
  };

  const handleStatusChange = (id: string, status: EventStatus) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const revenue = status === "completed" ? e.ticketsSold * e.coverCharge : e.revenue;
        return { ...e, status, revenue };
      }),
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Music className="h-5 w-5 text-rose-500" />
            Live Events
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage music nights, shows, and event listings</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {/* Today's Event Highlight */}
      {todayEvent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 p-6 text-white"
        >
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-2 flex items-center gap-1.5">
              <Star className="h-3 w-3" />
              Tonight&apos;s Event
            </p>
            <h3 className="text-xl font-bold mb-1">{todayEvent.name}</h3>
            {todayEvent.performer && <p className="text-sm text-white/80 mb-2">Featuring: {todayEvent.performer}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-white/90">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{todayEvent.startTime} - {todayEvent.endTime}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{todayEvent.ticketsSold}/{todayEvent.capacity}</span>
              {todayEvent.coverCharge > 0 && <span className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />{formatPrice(todayEvent.coverCharge, cur)}</span>}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Upcoming Events", value: String(totalUpcoming), icon: Calendar, color: "#3B82F6" },
          { label: "Total Events", value: String(events.length), icon: Music, color: "#EC4899" },
          { label: "Total Revenue", value: formatPrice(totalRevenue, cur), icon: DollarSign, color: "#10B981" },
          { label: "Avg Attendance", value: `${Math.round(events.reduce((s, e) => s + (e.ticketsSold / e.capacity) * 100, 0) / events.length)}%`, icon: Users, color: "#8B5CF6" },
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

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "upcoming", "ongoing", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-rose-100 text-rose-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Create Event Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Create New Event</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Event Name</label>
                  <input type="text" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="e.g., Friday Jazz Night" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Performer / Act</label>
                  <input type="text" value={newEvent.performer} onChange={(e) => setNewEvent({ ...newEvent, performer: e.target.value })} placeholder="e.g., DJ Prashant" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time</label>
                  <input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">End Time</label>
                  <input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cover Charge ({getCurrencySymbol(cur)})</label>
                  <input type="number" value={newEvent.coverCharge} onChange={(e) => setNewEvent({ ...newEvent, coverCharge: e.target.value })} placeholder="0 for free" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity</label>
                  <input type="number" value={newEvent.capacity} onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })} placeholder="50" className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={2} placeholder="Event details..." className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm ring-1 ring-gray-200 outline-none focus:ring-rose-400 resize-none" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={newEvent.recurring} onChange={(e) => setNewEvent({ ...newEvent, recurring: e.target.checked })} className="rounded text-rose-500" />
                  Recurring event (weekly)
                </label>
                <button onClick={handleCreate} disabled={!newEvent.name || !newEvent.date} className="flex items-center gap-2 rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:bg-gray-200 disabled:text-gray-400 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List */}
      <div className="space-y-3">
        {filtered.map((event) => {
          const tc = EVENT_TYPE_CONFIG[event.type];
          const sc = STATUS_COLORS[event.status];
          const Icon = tc.icon;
          const occupancy = Math.round((event.ticketsSold / event.capacity) * 100);

          return (
            <motion.div key={event.id} layout className={`rounded-xl bg-white ring-1 ring-gray-100 p-4 shadow-sm ${event.status === "cancelled" ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tc.bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${tc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900">{event.name}</h3>
                    <span className={`text-[9px] font-bold ${sc.color} ${sc.bg} px-1.5 py-0.5 rounded`}>{sc.label}</span>
                    {event.recurring && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Weekly</span>}
                  </div>
                  {event.performer && <p className="text-xs text-gray-500 mb-1.5">Featuring: {event.performer}</p>}
                  <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{event.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.startTime} - {event.endTime}</span>
                    {event.coverCharge > 0 && <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />{formatPrice(event.coverCharge, cur)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${occupancy > 80 ? "bg-green-400" : occupancy > 50 ? "bg-amber-400" : "bg-gray-300"}`} style={{ width: `${occupancy}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{occupancy}%</span>
                  </div>
                  <p className="text-xs text-gray-500">{event.ticketsSold}/{event.capacity} sold</p>
                  {event.revenue > 0 && <p className="text-xs font-bold text-green-500 mt-0.5">{formatPrice(event.revenue, cur)}</p>}
                </div>
              </div>
              {event.status === "upcoming" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => handleStatusChange(event.id, "ongoing")} className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all">Start Event</button>
                  <button onClick={() => handleStatusChange(event.id, "cancelled")} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-all">Cancel</button>
                </div>
              )}
              {event.status === "ongoing" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => handleStatusChange(event.id, "completed")} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">End Event</button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Music className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No events found</p>
        </div>
      )}
    </div>
  );
}
