"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  MapPin,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Clock,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Truck,
  Ban,
  Shield,
  Edit2,
  Trash2,
  Target,
  Navigation,
} from "lucide-react";

interface DeliveryZone {
  id: string;
  name: string;
  areaDescription: string;
  radiusKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  estimatedTimeMin: number;
  freeDeliveryThreshold: number;
  deliveryHoursStart: string;
  deliveryHoursEnd: string;
  active: boolean;
  priority: number;
  ordersThisWeek: number;
}

interface RestrictedZone {
  id: string;
  name: string;
  reason: string;
}

const emptyZoneForm = {
  name: "",
  areaDescription: "",
  radiusKm: 5,
  deliveryFee: 100,
  minOrderAmount: 300,
  estimatedTimeMin: 30,
  freeDeliveryThreshold: 1000,
  deliveryHoursStart: "09:00",
  deliveryHoursEnd: "21:00",
};

export default function DeliveryZonesTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [restrictedZones, setRestrictedZones] =
    useState<RestrictedZone[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRestricted, setShowAddRestricted] = useState(false);
  const [form, setForm] = useState(emptyZoneForm);
  const [restrictedForm, setRestrictedForm] = useState({
    name: "",
    reason: "",
  });
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const addZone = () => {
    if (!form.name.trim() || !form.areaDescription.trim()) return;
    const newZone: DeliveryZone = {
      id: Date.now().toString(),
      ...form,
      active: true,
      priority: zones.length + 1,
      ordersThisWeek: 0,
    };
    setZones((prev) => [...prev, newZone]);
    setForm(emptyZoneForm);
    setShowAddForm(false);
  };

  const toggleZone = (id: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, active: !z.active } : z))
    );
  };

  const deleteZone = (id: string) => {
    setZones((prev) => {
      const filtered = prev.filter((z) => z.id !== id);
      return filtered.map((z, i) => ({ ...z, priority: i + 1 }));
    });
  };

  const movePriority = (index: number, direction: "up" | "down") => {
    const newZones = [...zones];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newZones.length) return;
    [newZones[index], newZones[swapIndex]] = [
      newZones[swapIndex],
      newZones[index],
    ];
    newZones.forEach((z, i) => (z.priority = i + 1));
    setZones(newZones);
  };

  const addRestricted = () => {
    if (!restrictedForm.name.trim()) return;
    setRestrictedZones((prev) => [
      ...prev,
      { id: Date.now().toString(), ...restrictedForm },
    ]);
    setRestrictedForm({ name: "", reason: "" });
    setShowAddRestricted(false);
  };

  const removeRestricted = (id: string) => {
    setRestrictedZones((prev) => prev.filter((z) => z.id !== id));
  };

  const totalActiveZones = zones.filter((z) => z.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Zones</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure delivery area coverage and pricing
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Zone
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Target className="w-5 h-5 text-violet-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{zones.length}</p>
          <p className="text-xs text-gray-500">Total Zones</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Navigation className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{totalActiveZones}</p>
          <p className="text-xs text-gray-500">Active Zones</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <MapPin className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {Math.max(...zones.map((z) => z.radiusKm), 0)} km
          </p>
          <p className="text-xs text-gray-500">Max Radius</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Ban className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {restrictedZones.length}
          </p>
          <p className="text-xs text-gray-500">Restricted Areas</p>
        </div>
      </div>

      {/* Add Zone Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-violet-600" />
                  Add New Delivery Zone
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyZoneForm);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g., Zone D - Outer Ring"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Coverage Area Description *
                  </label>
                  <input
                    type="text"
                    value={form.areaDescription}
                    onChange={(e) =>
                      setForm({ ...form, areaDescription: e.target.value })
                    }
                    placeholder="e.g., Kirtipur, Thankot, Kalanki areas"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Radius (km)
                  </label>
                  <input
                    type="number"
                    value={form.radiusKm}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        radiusKm: Number(e.target.value) || 1,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    {`Delivery Charge (${getCurrencySymbol(cur)})`}
                  </label>
                  <input
                    type="number"
                    value={form.deliveryFee}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryFee: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    {`Min Order Amount (${getCurrencySymbol(cur)})`}
                  </label>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minOrderAmount: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Estimated Time (min)
                  </label>
                  <input
                    type="number"
                    value={form.estimatedTimeMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedTimeMin: Number(e.target.value) || 10,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    {`Free Delivery Threshold (${getCurrencySymbol(cur)})`}
                  </label>
                  <input
                    type="number"
                    value={form.freeDeliveryThreshold}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        freeDeliveryThreshold: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Delivery Hours Start
                  </label>
                  <input
                    type="time"
                    value={form.deliveryHoursStart}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryHoursStart: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Delivery Hours End
                  </label>
                  <input
                    type="time"
                    value={form.deliveryHoursEnd}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryHoursEnd: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyZoneForm);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addZone}
                  disabled={
                    !form.name.trim() || !form.areaDescription.trim()
                  }
                  className="px-4 py-2 text-sm bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Zone
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {zones.map((zone, idx) => (
            <motion.div
              key={zone.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                zone.active ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  {/* Priority controls */}
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <button
                      onClick={() => movePriority(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-violet-500 w-5 text-center">
                      #{zone.priority}
                    </span>
                    <button
                      onClick={() => movePriority(idx, "down")}
                      disabled={idx === zones.length - 1}
                      className="p-0.5 rounded hover:bg-violet-100 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Zone icon */}
                  <div className="p-2.5 bg-violet-100 rounded-xl shrink-0">
                    <MapPin className="w-5 h-5 text-violet-600" />
                  </div>

                  {/* Zone info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        {zone.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          zone.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {zone.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {zone.areaDescription}
                    </p>

                    {/* Zone metrics */}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Target className="w-3 h-3 text-violet-500" />
                        {zone.radiusKm} km
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        {formatPrice(zone.deliveryFee, cur)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3 text-blue-500" />
                        ~{zone.estimatedTimeMin} min
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Truck className="w-3 h-3 text-amber-500" />
                        {zone.ordersThisWeek} orders/wk
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setExpandedZone(
                          expandedZone === zone.id ? null : zone.id
                        )
                      }
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => toggleZone(zone.id)}
                      className="focus:outline-none"
                    >
                      {zone.active ? (
                        <ToggleRight className="w-8 h-8 text-violet-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedZone === zone.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-violet-50 rounded-lg p-3">
                          <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wide">
                            Min Order
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {formatPrice(zone.minOrderAmount, cur)}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                            Free Delivery
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {formatPrice(zone.freeDeliveryThreshold, cur)}+
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                            Hours Start
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {zone.deliveryHoursStart}
                          </p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                            Hours End
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {zone.deliveryHoursEnd}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Restricted Zones */}
      <motion.div
        layout
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Restricted Zones
              </h3>
              <p className="text-xs text-gray-500">Areas not served</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddRestricted(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <AnimatePresence>
          {showAddRestricted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="flex items-end gap-3 p-3 bg-red-50 rounded-lg">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600">
                    Area Name
                  </label>
                  <input
                    type="text"
                    value={restrictedForm.name}
                    onChange={(e) =>
                      setRestrictedForm({
                        ...restrictedForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Chandragiri"
                    className="mt-1 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={restrictedForm.reason}
                    onChange={(e) =>
                      setRestrictedForm({
                        ...restrictedForm,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Why not served"
                    className="mt-1 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none bg-white"
                  />
                </div>
                <button
                  onClick={addRestricted}
                  disabled={!restrictedForm.name.trim()}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddRestricted(false);
                    setRestrictedForm({ name: "", reason: "" });
                  }}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {restrictedZones.map((rz) => (
            <div
              key={rz.id}
              className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100"
            >
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {rz.name}
                  </p>
                  {rz.reason && (
                    <p className="text-xs text-gray-500">{rz.reason}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeRestricted(rz.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
          {restrictedZones.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No restricted zones configured
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
