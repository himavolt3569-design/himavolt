"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListOrdered,
  Plus,
  X,
  Clock,
  Users,
  Phone,
  Bell,
  CheckCircle2,
  LogOut,
  Armchair,
  TrendingUp,
  Timer,
  AlertCircle,
  History,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type WaitlistStatus = "Waiting" | "Notified" | "Seated" | "Left";

interface WaitlistEntry {
  id: string;
  guestName: string;
  partySize: number;
  phone: string;
  status: WaitlistStatus;
  addedAt: number; // timestamp
  estimatedWait: number; // minutes
  notifiedAt?: number;
  seatedAt?: number;
  leftAt?: number;
}

interface TableInfo {
  id: string;
  capacity: number;
  occupied: boolean;
  avgDiningMinutes: number;
  occupiedSince?: number;
}


const statusColors: Record<WaitlistStatus, string> = {
  Waiting: "bg-yellow-100 text-yellow-800",
  Notified: "bg-blue-100 text-blue-800",
  Seated: "bg-emerald-100 text-emerald-800",
  Left: "bg-gray-200 text-gray-600",
};

const statusIcons: Record<WaitlistStatus, typeof Clock> = {
  Waiting: Clock,
  Notified: Bell,
  Seated: Armchair,
  Left: LogOut,
};

export default function WaitlistTab() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [history, setHistory] = useState<WaitlistEntry[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Form state
  const [formName, setFormName] = useState("");
  const [formPartySize, setFormPartySize] = useState(2);
  const [formPhone, setFormPhone] = useState("");

  // Tick every minute to update wait times
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedMinutes = (timestamp: number) =>
    Math.round((currentTime - timestamp) / 60000);

  const estimateWaitTime = (partySize: number): number => {
    // Find tables that can fit this party
    const suitableTables = tables.filter((t) => t.capacity >= partySize);
    if (suitableTables.length === 0) return 60; // No suitable tables

    // Find the soonest available table
    const freeSuitable = suitableTables.filter((t) => !t.occupied);
    if (freeSuitable.length > 0) return 5; // Table available soon

    // Estimate based on occupied tables
    const waitTimes = suitableTables
      .filter((t) => t.occupied && t.occupiedSince)
      .map((t) => {
        const elapsed = getElapsedMinutes(t.occupiedSince!);
        const remaining = Math.max(0, t.avgDiningMinutes - elapsed);
        return remaining;
      });

    // Also account for people waiting ahead
    const waitingAhead = waitlist.filter(
      (w) =>
        w.status === "Waiting" &&
        w.partySize <= partySize + 2 // similar sized parties
    ).length;

    const soonest = waitTimes.length > 0 ? Math.min(...waitTimes) : 30;
    return Math.max(5, soonest + waitingAhead * 10);
  };

  const addToWaitlist = () => {
    if (!formName.trim() || !formPhone.trim()) return;
    const est = estimateWaitTime(formPartySize);
    const entry: WaitlistEntry = {
      id: Date.now().toString(),
      guestName: formName.trim(),
      partySize: formPartySize,
      phone: formPhone.trim(),
      status: "Waiting",
      addedAt: Date.now(),
      estimatedWait: est,
    };
    setWaitlist((prev) => [...prev, entry]);
    setFormName("");
    setFormPartySize(2);
    setFormPhone("");
    setShowForm(false);
  };

  const notifyGuest = (id: string) => {
    setWaitlist((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: "Notified" as WaitlistStatus, notifiedAt: Date.now() } : w
      )
    );
  };

  const seatGuest = (id: string) => {
    const entry = waitlist.find((w) => w.id === id);
    if (!entry) return;

    // Find and occupy a suitable free table
    const freeTable = tables.find(
      (t) => !t.occupied && t.capacity >= entry.partySize
    );
    if (freeTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === freeTable.id
            ? { ...t, occupied: true, occupiedSince: Date.now() }
            : t
        )
      );
    }

    const seated: WaitlistEntry = {
      ...entry,
      status: "Seated",
      seatedAt: Date.now(),
    };
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
    setHistory((prev) => [seated, ...prev]);
  };

  const markAsLeft = (id: string) => {
    const entry = waitlist.find((w) => w.id === id);
    if (!entry) return;
    const left: WaitlistEntry = {
      ...entry,
      status: "Left",
      leftAt: Date.now(),
    };
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
    setHistory((prev) => [left, ...prev]);
  };

  const removeFromWaitlist = (id: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
  };

  const activeWaitlist = waitlist.filter(
    (w) => w.status === "Waiting" || w.status === "Notified"
  );

  const getPositionLabel = (index: number) => {
    const n = index + 1;
    const suffix =
      n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
    return `${n}${suffix}`;
  };

  // Stats
  const avgWaitToday = (() => {
    const seatedHistory = history.filter(
      (h) => h.status === "Seated" && h.seatedAt
    );
    if (seatedHistory.length === 0) return 0;
    const totalWait = seatedHistory.reduce(
      (sum, h) => sum + Math.round((h.seatedAt! - h.addedAt) / 60000),
      0
    );
    return Math.round(totalWait / seatedHistory.length);
  })();

  const peakWait = (() => {
    const allWaits = [
      ...activeWaitlist.map((w) => getElapsedMinutes(w.addedAt)),
      ...history
        .filter((h) => h.status === "Seated" && h.seatedAt)
        .map((h) => Math.round((h.seatedAt! - h.addedAt) / 60000)),
    ];
    return allWaits.length > 0 ? Math.max(...allWaits) : 0;
  })();

  const freeTables = tables.filter((t) => !t.occupied);
  const totalGuests = activeWaitlist.reduce((s, w) => s + w.partySize, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-emerald-600" />
            Waitlist Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Queue management for walk-in guests
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add to Waitlist
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "In Queue",
            value: activeWaitlist.length,
            sub: `${totalGuests} guests`,
            icon: Users,
            color: "text-emerald-600",
          },
          {
            label: "Free Tables",
            value: freeTables.length,
            sub: `of ${tables.length} total`,
            icon: Armchair,
            color: "text-blue-600",
          },
          {
            label: "Avg Wait Today",
            value: `${avgWaitToday}m`,
            sub: "per guest",
            icon: Timer,
            color: "text-yellow-600",
          },
          {
            label: "Peak Wait",
            value: `${peakWait}m`,
            sub: "longest today",
            icon: TrendingUp,
            color: "text-red-600",
          },
          {
            label: "Seated Today",
            value: history.filter((h) => h.status === "Seated").length,
            sub: "from waitlist",
            icon: CheckCircle2,
            color: "text-gray-600",
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Peak Wait Indicator */}
      {activeWaitlist.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-xl p-4 flex items-center gap-3 ${
            activeWaitlist.length >= 5
              ? "bg-red-50 border border-red-200"
              : activeWaitlist.length >= 3
              ? "bg-yellow-50 border border-yellow-200"
              : "bg-emerald-50 border border-emerald-200"
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 ${
              activeWaitlist.length >= 5
                ? "text-red-600"
                : activeWaitlist.length >= 3
                ? "text-yellow-600"
                : "text-emerald-600"
            }`}
          />
          <div>
            <p
              className={`text-sm font-medium ${
                activeWaitlist.length >= 5
                  ? "text-red-800"
                  : activeWaitlist.length >= 3
                  ? "text-yellow-800"
                  : "text-emerald-800"
              }`}
            >
              {activeWaitlist.length >= 5
                ? "High demand - Long wait times expected"
                : activeWaitlist.length >= 3
                ? "Moderate demand - Average wait times"
                : "Low demand - Short wait times"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {freeTables.length} table(s) available &middot; Estimated new wait:{" "}
              {estimateWaitTime(2)} min for party of 2
            </p>
          </div>
        </motion.div>
      )}

      {/* Add to Waitlist Form */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add to Waitlist
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                      Phone *
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="+977-98..."
                    />
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-sm text-emerald-800 font-medium">
                    Estimated Wait: ~{estimateWaitTime(formPartySize)} minutes
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Based on current table availability and queue
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addToWaitlist}
                    disabled={!formName.trim() || !formPhone.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Queue
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Waitlist */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-600" />
            Current Queue ({activeWaitlist.length})
          </h3>
        </div>

        {activeWaitlist.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ListOrdered className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No guests waiting</p>
            <p className="text-xs mt-1">Add walk-in guests to the waitlist</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {activeWaitlist.map((entry, index) => {
                const StatusIcon = statusIcons[entry.status];
                const elapsed = getElapsedMinutes(entry.addedAt);
                const overEstimate = elapsed > entry.estimatedWait;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`px-5 py-4 ${
                      entry.status === "Notified" ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Position */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-700">
                          {getPositionLabel(index)}
                        </span>
                      </div>

                      {/* Guest Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.guestName}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              statusColors[entry.status]
                            }`}
                          >
                            <StatusIcon className="w-3 h-3 inline mr-0.5" />
                            {entry.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {entry.partySize}{" "}
                            guests
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {entry.phone}
                          </span>
                        </div>
                      </div>

                      {/* Wait Time */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-lg font-bold ${
                            overEstimate ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {elapsed}m
                        </p>
                        <p className="text-[10px] text-gray-400">
                          est. {entry.estimatedWait}m
                        </p>
                        {overEstimate && (
                          <p className="text-[10px] text-red-500 font-medium">
                            +{elapsed - entry.estimatedWait}m over
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {entry.status === "Waiting" && (
                          <button
                            onClick={() => notifyGuest(entry.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                            title="Notify guest"
                          >
                            <Bell className="w-3.5 h-3.5" /> Notify
                          </button>
                        )}
                        <button
                          onClick={() => seatGuest(entry.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
                          title="Seat guest"
                        >
                          <Armchair className="w-3.5 h-3.5" /> Seat
                        </button>
                        <button
                          onClick={() => markAsLeft(entry.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                          title="Guest left"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromWaitlist(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {entry.status === "Notified" && entry.notifiedAt && (
                      <p className="text-[10px] text-blue-500 mt-2 ml-16">
                        SMS sent {getElapsedMinutes(entry.notifiedAt)} min ago
                        &mdash; Waiting for guest to arrive
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Table Availability Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Armchair className="w-4 h-4 text-emerald-600" />
          Table Status
        </h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg p-2 text-center ${
                t.occupied
                  ? "bg-red-50 border border-red-200"
                  : "bg-emerald-50 border border-emerald-200"
              }`}
            >
              <p className="text-xs font-bold text-gray-700">{t.id}</p>
              <p className="text-[10px] text-gray-500">{t.capacity} seats</p>
              {t.occupied && t.occupiedSince && (
                <p className="text-[10px] text-red-500 font-medium">
                  {getElapsedMinutes(t.occupiedSince)}m
                </p>
              )}
              {!t.occupied && (
                <p className="text-[10px] text-emerald-600 font-medium">Free</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* History Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            Today&apos;s Waitlist History ({history.length})
          </h3>
          {showHistory ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {history.map((entry) => {
                  const waitedMinutes = entry.seatedAt
                    ? Math.round((entry.seatedAt - entry.addedAt) / 60000)
                    : entry.leftAt
                    ? Math.round((entry.leftAt - entry.addedAt) / 60000)
                    : 0;

                  return (
                    <div
                      key={entry.id}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            statusColors[entry.status]
                          }`}
                        >
                          {entry.status}
                        </span>
                        <div>
                          <p className="text-sm text-gray-900">
                            {entry.guestName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Party of {entry.partySize} &middot; Waited{" "}
                            {waitedMinutes}m
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        {entry.seatedAt
                          ? `Seated at ${new Date(entry.seatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : entry.leftAt
                          ? `Left at ${new Date(entry.leftAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
