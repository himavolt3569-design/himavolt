"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Plus, Trash2, Clock, ToggleLeft, ToggleRight,
  Timer, TrendingUp, X, Check, AlertCircle, Activity,
  DollarSign, Loader2, Save,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface RushHourSlot { id: string; label: string; startTime: string; endTime: string; days: string[]; isActive: boolean }
interface RushHourConfig { isEnabled: boolean; surgeEnabled: boolean; surgePercent: number; slots: RushHourSlot[] }

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

export default function RushHourTab({ restaurantId }: { restaurantId?: string }) {
  if (!restaurantId) return null;
  const [config, setConfig] = useState<RushHourConfig>({ isEnabled: false, surgeEnabled: false, surgePercent: 10, slots: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("11:00");
  const [newEnd, setNewEnd] = useState("13:00");
  const [newDays, setNewDays] = useState<string[]>([]);
  const [surgeLocal, setSurgeLocal] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RushHourConfig>(`/api/restaurants/${restaurantId}/rush-hour`);
      setConfig(data);
      setSurgeLocal(data.surgePercent ?? 10);
    } finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) load(); }, [restaurantId, load]);

  const patchConfig = async (patch: Partial<RushHourConfig>) => {
    setSaving(true);
    try {
      const updated = await apiFetch<RushHourConfig>(`/api/restaurants/${restaurantId}/rush-hour`, { method: "PATCH", body: patch });
      setConfig(updated);
    } finally { setSaving(false); }
  };

  const addSlot = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const slot = await apiFetch<RushHourSlot>(`/api/restaurants/${restaurantId}/rush-hour/slots`, {
        method: "POST", body: { label: newLabel.trim(), startTime: newStart, endTime: newEnd, days: newDays },
      });
      setConfig((prev) => ({ ...prev, slots: [...prev.slots, slot] }));
      setNewLabel(""); setNewStart("11:00"); setNewEnd("13:00"); setNewDays([]); setShowAddSlot(false);
    } finally { setSaving(false); }
  };

  const toggleSlot = async (slot: RushHourSlot) => {
    const updated = await apiFetch<RushHourSlot>(`/api/restaurants/${restaurantId}/rush-hour/slots/${slot.id}`, {
      method: "PATCH", body: { isActive: !slot.isActive },
    });
    setConfig((prev) => ({ ...prev, slots: prev.slots.map((s) => s.id === slot.id ? updated : s) }));
  };

  const removeSlot = async (id: string) => {
    if (!confirm("Remove this rush hour slot?")) return;
    await apiFetch(`/api/restaurants/${restaurantId}/rush-hour/slots/${id}`, { method: "DELETE" });
    setConfig((prev) => ({ ...prev, slots: prev.slots.filter((s) => s.id !== id) }));
  };

  const saveSurge = () => patchConfig({ surgeEnabled: config.surgeEnabled, surgePercent: surgeLocal });
  const toggleDay = (day: string) => setNewDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayNames[now.getDay()];

  const isInRushNow = config.isEnabled && config.slots.some((s) => {
    if (!s.isActive) return false;
    if (s.days.length > 0 && !s.days.includes(today)) return false;
    return currentMins >= timeToMins(s.startTime) && currentMins < timeToMins(s.endTime);
  });

  const isInRushHour = (hour: number) => config.slots.some((s) => {
    if (!s.isActive) return false;
    const sm = timeToMins(s.startTime), em = timeToMins(s.endTime);
    return hour * 60 >= sm && hour * 60 < em;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isInRushNow ? "bg-red-100" : "bg-amber-100"}`}>
            <Flame className={`w-6 h-6 ${isInRushNow ? "text-red-500" : "text-amber-600"}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rush Hour</h2>
            <p className="text-sm text-gray-500">Define peak hours and optionally apply surge pricing</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isInRushNow && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> RUSH ACTIVE NOW
            </span>
          )}
          <button onClick={() => patchConfig({ isEnabled: !config.isEnabled })} className="flex items-center gap-2 text-sm font-medium" disabled={saving}>
            {config.isEnabled ? <ToggleRight className="w-8 h-8 text-amber-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            <span className={config.isEnabled ? "text-amber-600" : "text-gray-400"}>{config.isEnabled ? "Enabled" : "Disabled"}</span>
          </button>
        </div>
      </div>

      {config.isEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Daily Timeline */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Daily Timeline</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded-sm inline-block" /> Rush Hours</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm inline-block" /> Now</span>
              </div>
            </div>
            <div className="flex gap-0.5 items-end h-16">
              {HOURS.map((h) => {
                const isRush = isInRushHour(h);
                const isCurrent = h === now.getHours();
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className={`w-full rounded-t-sm transition-colors ${isCurrent ? "bg-blue-500" : isRush ? "bg-amber-400" : "bg-gray-100"}`}
                      style={{ height: isRush ? "100%" : "40%" }} />
                    {h % 4 === 0 && <span className="text-[9px] text-gray-400">{String(h).padStart(2, "0")}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slots + Surge grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rush Slots */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rush Slots</h3>
                <button onClick={() => setShowAddSlot(!showAddSlot)} className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence>
                {showAddSlot && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                      <input type="text" placeholder="Label (e.g. Lunch Rush)" value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Start</label>
                          <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-amber-700 flex items-center gap-1"><Timer className="w-3 h-3" /> End</label>
                          <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1.5">Days (leave empty = every day)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((d) => (
                            <button key={d} onClick={() => toggleDay(d)}
                              className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${newDays.includes(d) ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-600"}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddSlot(false)} className="flex-1 text-xs text-gray-500 py-1.5 hover:text-gray-700">Cancel</button>
                        <button onClick={addSlot} disabled={!newLabel.trim() || saving}
                          className="flex-1 flex items-center justify-center gap-1 bg-amber-500 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add Slot
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {config.slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{slot.label}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {slot.startTime} – {slot.endTime}
                        {slot.days.length > 0 && <span className="ml-1 text-amber-600 font-medium">{slot.days.join(", ")}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleSlot(slot)}>
                        {slot.isActive ? <ToggleRight className="w-6 h-6 text-amber-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                      </button>
                      <button onClick={() => removeSlot(slot.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {config.slots.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No slots defined. Add your first rush hour slot.</p>
                )}
              </div>
            </div>

            {/* Surge Pricing */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Surge Pricing</h3>
                <button onClick={() => patchConfig({ surgeEnabled: !config.surgeEnabled })} disabled={saving}>
                  {config.surgeEnabled ? <ToggleRight className="w-7 h-7 text-amber-500" /> : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                </button>
              </div>

              {config.surgeEnabled ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <p className="text-xs text-gray-500">Menu prices increase automatically during rush hours. Customers are shown a notice.</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-500" /> Price Increase
                      </label>
                      <span className="text-sm font-bold text-amber-600">{surgeLocal}%</span>
                    </div>
                    <input type="range" min={5} max={50} step={5} value={surgeLocal}
                      onChange={(e) => setSurgeLocal(Number(e.target.value))} className="w-full accent-amber-500" />
                    <div className="flex justify-between text-xs text-gray-400"><span>5%</span><span>25%</span><span>50%</span></div>
                  </div>
                  <button onClick={saveSurge} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Surge Setting
                  </button>
                  <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">Prices increase by {surgeLocal}% during active rush slots. A banner will warn customers on the menu page.</p>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Enable surge pricing to automatically adjust menu prices during peak hours</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!config.isEnabled && (
        <div className="text-center py-16 text-gray-400">
          <Flame className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Rush Hour is disabled</p>
          <p className="text-xs mt-1">Enable it above to configure peak-time slots and surge pricing</p>
        </div>
      )}
    </motion.div>
  );
}
