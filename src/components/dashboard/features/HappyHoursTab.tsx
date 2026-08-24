"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  PartyPopper,
  Calendar,
  X,
  Loader2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";

interface HappyHour {
  id: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  appliesToAll: boolean;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function HappyHoursTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id ?? null;

  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newHH, setNewHH] = useState({
    name: "",
    days: [] as string[],
    startTime: "17:00",
    endTime: "19:00",
    discountType: "PERCENTAGE",
    discountValue: "",
    appliesToAll: true,
  });

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ happyHours: HappyHour[] }>(
      `/api/restaurants/${restaurantId}/happy-hours`,
    )
      .then((res) => {
        if (!cancelled) setHappyHours(res.happyHours);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const isHappyHourActive = (() => {
    const now = new Date();
    const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const today = dayMap[now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map((n) => parseInt(n, 10));
      return h * 60 + (m || 0);
    };
    return happyHours.some((hh) => {
      if (!hh.isActive) return false;
      if (hh.days.length > 0 && !hh.days.includes(today)) return false;
      const s = toMin(hh.startTime);
      const e = toMin(hh.endTime);
      return e >= s ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e;
    });
  })();

  const toggleDay = (day: string) => {
    setNewHH((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const createHappyHour = async () => {
    if (!restaurantId || !newHH.name.trim() || !newHH.discountValue) return;
    setSaving(true);
    try {
      const res = await apiFetch<HappyHour>(
        `/api/restaurants/${restaurantId}/happy-hours`,
        {
          method: "POST",
          body: {
            name: newHH.name.trim(),
            days: newHH.days,
            startTime: newHH.startTime,
            endTime: newHH.endTime,
            discountType: newHH.discountType,
            discountValue: parseFloat(newHH.discountValue),
            appliesToAll: newHH.appliesToAll,
          },
        },
      );
      setHappyHours((prev) => [res, ...prev]);
      setNewHH({
        name: "",
        days: [],
        startTime: "17:00",
        endTime: "19:00",
        discountType: "PERCENTAGE",
        discountValue: "",
        appliesToAll: true,
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (hh: HappyHour) => {
    if (!restaurantId) return;
    try {
      const updated = await apiFetch<HappyHour>(
        `/api/restaurants/${restaurantId}/happy-hours/${hh.id}`,
        { method: "PATCH", body: { isActive: !hh.isActive } },
      );
      setHappyHours((prev) => prev.map((h) => (h.id === hh.id ? updated : h)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const deleteHappyHour = async (id: string) => {
    if (!restaurantId) return;
    if (!confirm("Delete this happy hour?")) return;
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/happy-hours/${id}`,
        { method: "DELETE" },
      );
      setHappyHours((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (!restaurantId) {
    return (
      <div className="text-[var(--text-3)] p-4">No restaurant selected</div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 flex items-center justify-between ${
          isHappyHourActive
            ? "bg-gradient-to-r from-rose-500 to-red-600 text-white"
            : "bg-zinc-800 text-[var(--text-3)] border border-zinc-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <PartyPopper
            className={`w-6 h-6 ${isHappyHourActive ? "animate-bounce" : ""}`}
          />
          <div>
            <h3 className="font-bold text-lg">
              {isHappyHourActive
                ? "Happy Hour Active!"
                : "No Happy Hour Right Now"}
            </h3>
            <p
              className={`text-sm ${
                isHappyHourActive ? "text-rose-100" : "text-[var(--text-3)]"
              }`}
            >
              {isHappyHourActive
                ? "Discounted prices are currently applied"
                : happyHours.length === 0
                  ? "No schedules set up yet"
                  : "Waiting for next active window"}
            </p>
          </div>
        </div>
        <Clock className="w-5 h-5 opacity-70" />
      </motion.div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-400" />
            Schedules
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>

        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-zinc-800/80 rounded-xl p-5 border border-zinc-700/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">
                    Create New Happy Hour
                  </h4>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-[var(--text-3)] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[var(--text-3)] text-sm mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newHH.name}
                    onChange={(e) =>
                      setNewHH((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Weekday Happy Hour"
                    className="w-full bg-[var(--text-1)] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-3)] text-sm mb-2 block">
                    Days (leave all off for every day)
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          newHH.days.includes(day)
                            ? "bg-rose-600 text-white"
                            : "bg-zinc-700 text-[var(--text-3)] hover:bg-zinc-600"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-3)] text-sm mb-1 block">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newHH.startTime}
                      onChange={(e) =>
                        setNewHH((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--text-1)] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-3)] text-sm mb-1 block">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newHH.endTime}
                      onChange={(e) =>
                        setNewHH((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--text-1)] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-3)] text-sm mb-1 block">
                      Discount Type
                    </label>
                    <select
                      value={newHH.discountType}
                      onChange={(e) =>
                        setNewHH((prev) => ({
                          ...prev,
                          discountType: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--text-1)] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Flat (Rs)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[var(--text-3)] text-sm mb-1 block">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={newHH.discountValue}
                      onChange={(e) =>
                        setNewHH((prev) => ({
                          ...prev,
                          discountValue: e.target.value,
                        }))
                      }
                      placeholder={
                        newHH.discountType === "PERCENTAGE" ? "25" : "200"
                      }
                      className="w-full bg-[var(--text-1)] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={createHappyHour}
                  disabled={saving}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : "Create Happy Hour"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center justify-center py-8 text-[var(--text-3)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        )}

        <div className="space-y-3">
          {happyHours.map((hh, index) => (
            <motion.div
              key={hh.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: index * 0.05 }}
              className={`bg-zinc-800/80 rounded-xl p-4 border ${
                hh.isActive ? "border-rose-500/50" : "border-zinc-700/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-medium">{hh.name}</h4>
                    {hh.isActive && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs rounded-full font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-3)] text-sm mt-0.5">
                    {hh.days.length === 0 ? "Every day" : hh.days.join(", ")}{" "}
                    &middot; {hh.startTime} - {hh.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(hh)}
                    className="text-[var(--text-3)] hover:text-white transition-colors"
                  >
                    {hh.isActive ? (
                      <ToggleRight className="w-6 h-6 text-rose-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteHappyHour(hh.id)}
                    className="text-[var(--text-3)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--text-3)]">
                  {hh.discountType === "PERCENTAGE"
                    ? `${hh.discountValue}% off`
                    : `Rs ${hh.discountValue} off`}
                </span>
                <span className="text-[var(--text-3)]">&middot;</span>
                <span className="text-[var(--text-3)]">
                  {hh.appliesToAll ? "All drinks" : "Select items"}
                </span>
              </div>
            </motion.div>
          ))}

          {!loading && happyHours.length === 0 && (
            <div className="text-[var(--text-3)] text-sm text-center py-8 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
              No happy hour schedules yet. Click &quot;New Schedule&quot; to add one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
