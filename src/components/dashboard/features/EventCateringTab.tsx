"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Plus,
  Users,
  MapPin,
  DollarSign,
  Clock,
  ChevronRight,
  X,
  PartyPopper,
  Building2,
  Heart,
  Briefcase,
  Sparkles,
  FileText,
  Package,
  Phone,
  Trash2,
  ChevronLeft,
} from "lucide-react";

type EventStatus =
  | "Inquiry"
  | "Quote Sent"
  | "Confirmed"
  | "In Progress"
  | "Completed";

type EventType =
  | "Wedding"
  | "Conference"
  | "Party"
  | "Corporate"
  | "Custom";

interface CateringEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  guestCount: number;
  venue: string;
  status: EventStatus;
  menuSelections: string[];
  specialRequirements: string;
  contactPerson: string;
  contactPhone: string;
  budget: number;
}

interface EventPackage {
  id: string;
  name: string;
  type: EventType;
  items: string[];
  pricePerHead: number;
  minGuests: number;
}

const STATUS_CONFIG: Record<
  EventStatus,
  { bg: string; text: string; border: string }
> = {
  Inquiry: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Quote Sent": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Confirmed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "In Progress": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Completed: { bg: "bg-stone-50", text: "text-stone-600", border: "border-stone-200" },
};

const STATUS_FLOW: EventStatus[] = [
  "Inquiry",
  "Quote Sent",
  "Confirmed",
  "In Progress",
  "Completed",
];

const EVENT_ICONS: Record<EventType, typeof PartyPopper> = {
  Wedding: Heart,
  Conference: Building2,
  Party: PartyPopper,
  Corporate: Briefcase,
  Custom: Sparkles,
};


const MENU_OPTIONS = [
  "Appetizer Platter",
  "Soup Station",
  "Salad Bar",
  "Butter Chicken",
  "Paneer Tikka",
  "Biryani",
  "Grilled Fish",
  "Pasta Station",
  "Pizza Station",
  "BBQ Grill",
  "Sandwich Platter",
  "Lunch Buffet",
  "Cocktail Menu",
  "Finger Foods",
  "Custom Cake",
  "Dessert Table",
  "Wedding Cake",
  "Coffee & Tea",
  "Snack Boxes",
  "Beverages",
  "Wine Selection",
];

export default function EventCateringTab() {
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [packages] = useState<EventPackage[]>([]);
  const [activeView, setActiveView] = useState<"events" | "calendar" | "packages">("events");
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 2));
  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "Wedding" as EventType,
    date: "",
    guestCount: 50,
    venue: "",
    menuSelections: [] as string[],
    specialRequirements: "",
    contactPerson: "",
    contactPhone: "",
    budget: 0,
  });

  const advanceStatus = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const idx = STATUS_FLOW.indexOf(e.status);
        if (idx < STATUS_FLOW.length - 1) {
          return { ...e, status: STATUS_FLOW[idx + 1] };
        }
        return e;
      })
    );
  };

  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEvent === eventId) setSelectedEvent(null);
  };

  const toggleNewEventMenu = (item: string) => {
    setNewEvent((prev) => ({
      ...prev,
      menuSelections: prev.menuSelections.includes(item)
        ? prev.menuSelections.filter((m) => m !== item)
        : [...prev.menuSelections, item],
    }));
  };

  const submitNewEvent = () => {
    if (!newEvent.name || !newEvent.date || !newEvent.venue) return;
    const event: CateringEvent = {
      id: `e${Date.now()}`,
      ...newEvent,
      status: "Inquiry",
    };
    setEvents((prev) => [...prev, event]);
    setNewEvent({
      name: "",
      type: "Wedding",
      date: "",
      guestCount: 50,
      venue: "",
      menuSelections: [],
      specialRequirements: "",
      contactPerson: "",
      contactPhone: "",
      budget: 0,
    });
    setShowNewEvent(false);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarMonth);

  const getEventsForDate = (day: number) => {
    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const detail = selectedEvent
    ? events.find((e) => e.id === selectedEvent)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">
            Event & Conference Catering
          </h2>
          <p className="text-sm text-stone-500">
            Manage event bookings, packages, and catering menus
          </p>
        </div>
        <button
          onClick={() => setShowNewEvent(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Events",
            value: events.length,
            icon: CalendarDays,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Confirmed",
            value: events.filter((e) => e.status === "Confirmed").length,
            icon: FileText,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Total Guests",
            value: events.reduce((s, e) => s + e.guestCount, 0),
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Est. Revenue",
            value: `$${events.reduce((s, e) => s + e.budget, 0).toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl ${stat.bg} border border-stone-100 p-4 shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-xs font-medium text-stone-500">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        {(["events", "calendar", "packages"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              activeView === view
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Events List */}
        {activeView === "events" && (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Status workflow legend */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {STATUS_FLOW.map((status, idx) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={status} className="flex items-center gap-1">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                    >
                      {status}
                    </span>
                    {idx < STATUS_FLOW.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {events.map((event) => {
              const cfg = STATUS_CONFIG[event.status];
              const Icon = EVENT_ICONS[event.type];
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-xl border bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md ${
                    selectedEvent === event.id
                      ? "border-amber-300 ring-2 ring-amber-100"
                      : "border-stone-200"
                  }`}
                  onClick={() =>
                    setSelectedEvent(
                      selectedEvent === event.id ? null : event.id
                    )
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
                        <Icon className="h-5 w-5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">
                          {event.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {event.guestCount} guests
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />$
                            {event.budget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                      >
                        {event.status}
                      </span>
                      {event.status !== "Completed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            advanceStatus(event.id);
                          }}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                        >
                          Advance
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event.id);
                        }}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {selectedEvent === event.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg bg-stone-50 p-3">
                              <p className="text-xs font-medium text-stone-500">
                                Contact
                              </p>
                              <p className="text-sm text-stone-700">
                                {event.contactPerson}
                              </p>
                              <p className="text-xs text-stone-500">
                                {event.contactPhone}
                              </p>
                            </div>
                            <div className="rounded-lg bg-stone-50 p-3">
                              <p className="text-xs font-medium text-stone-500">
                                Event Type
                              </p>
                              <p className="text-sm text-stone-700">
                                {event.type}
                              </p>
                            </div>
                          </div>

                          {event.menuSelections.length > 0 && (
                            <div className="rounded-lg bg-amber-50 p-3">
                              <p className="mb-2 text-xs font-medium text-stone-500">
                                Menu Selections
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {event.menuSelections.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs text-stone-600 shadow-sm"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {event.specialRequirements && (
                            <div className="rounded-lg bg-stone-50 p-3">
                              <p className="text-xs font-medium text-stone-500">
                                Special Requirements
                              </p>
                              <p className="text-sm text-stone-600">
                                {event.specialRequirements}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Calendar View */}
        {activeView === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1
                    )
                  )
                }
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-semibold text-stone-800">
                {calendarMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1
                    )
                  )
                }
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-medium text-stone-400"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                return (
                  <div
                    key={day}
                    className={`min-h-[60px] rounded-lg border p-1.5 text-xs ${
                      dayEvents.length > 0
                        ? "border-amber-200 bg-amber-50"
                        : "border-stone-100"
                    }`}
                  >
                    <span
                      className={`font-medium ${dayEvents.length > 0 ? "text-amber-700" : "text-stone-600"}`}
                    >
                      {day}
                    </span>
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="mt-0.5 truncate rounded bg-amber-200/60 px-1 py-0.5 text-[10px] font-medium text-amber-800"
                        title={ev.name}
                      >
                        {ev.name.length > 12
                          ? ev.name.substring(0, 12) + "..."
                          : ev.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Packages View */}
        {activeView === "packages" && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {packages.map((pkg) => {
              const Icon = EVENT_ICONS[pkg.type];
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                      <Icon className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {pkg.type} &middot; Min {pkg.minGuests} guests
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-1">
                    {pkg.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-stone-600"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2">
                    <span className="text-sm text-stone-600">
                      Price per head
                    </span>
                    <span className="text-lg font-bold text-emerald-700">
                      ${pkg.pricePerHead}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowNewEvent(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-800">
                  Create New Event
                </h3>
                <button
                  onClick={() => setShowNewEvent(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) =>
                      setNewEvent((ev) => ({ ...ev, name: e.target.value }))
                    }
                    placeholder="e.g., Annual Gala Dinner"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Event Type
                    </label>
                    <select
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent((ev) => ({
                          ...ev,
                          type: e.target.value as EventType,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    >
                      {(
                        [
                          "Wedding",
                          "Conference",
                          "Party",
                          "Corporate",
                          "Custom",
                        ] as EventType[]
                      ).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent((ev) => ({ ...ev, date: e.target.value }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Guest Count
                    </label>
                    <input
                      type="number"
                      value={newEvent.guestCount}
                      onChange={(e) =>
                        setNewEvent((ev) => ({
                          ...ev,
                          guestCount: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      value={newEvent.budget}
                      onChange={(e) =>
                        setNewEvent((ev) => ({
                          ...ev,
                          budget: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Venue / Room
                  </label>
                  <input
                    type="text"
                    value={newEvent.venue}
                    onChange={(e) =>
                      setNewEvent((ev) => ({ ...ev, venue: e.target.value }))
                    }
                    placeholder="e.g., Grand Ballroom"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={newEvent.contactPerson}
                      onChange={(e) =>
                        setNewEvent((ev) => ({
                          ...ev,
                          contactPerson: e.target.value,
                        }))
                      }
                      placeholder="Name"
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newEvent.contactPhone}
                      onChange={(e) =>
                        setNewEvent((ev) => ({
                          ...ev,
                          contactPhone: e.target.value,
                        }))
                      }
                      placeholder="+977-..."
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Menu Selections
                  </label>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-stone-200 p-3">
                    {MENU_OPTIONS.map((item) => {
                      const selected = newEvent.menuSelections.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleNewEventMenu(item)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            selected
                              ? "bg-amber-100 text-amber-700"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Special Requirements
                  </label>
                  <textarea
                    value={newEvent.specialRequirements}
                    onChange={(e) =>
                      setNewEvent((ev) => ({
                        ...ev,
                        specialRequirements: e.target.value,
                      }))
                    }
                    placeholder="Dietary restrictions, setup requirements, etc."
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-none"
                  />
                </div>

                <button
                  onClick={submitNewEvent}
                  disabled={
                    !newEvent.name || !newEvent.date || !newEvent.venue
                  }
                  className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create Event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
