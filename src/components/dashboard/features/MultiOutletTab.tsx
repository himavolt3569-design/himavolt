"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Clock,
  Users,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  X,
  Store,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  CheckSquare,
  Square,
} from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  location: string;
  description: string;
  operatingHours: { open: string; close: string };
  isActive: boolean;
  menuCategories: string[];
  assignedStaff: string[];
  todayRevenue: number;
  totalOrders: number;
}

const ALL_CATEGORIES = [
  "Appetizers",
  "Soups",
  "Salads",
  "Mains",
  "Seafood",
  "Grills",
  "Pizza",
  "Pasta",
  "Desserts",
  "Beverages",
  "Cocktails",
  "Wine",
];

const ALL_STAFF = [
  "Rajan K.",
  "Sita M.",
  "Hari B.",
  "Anita G.",
  "Ram S.",
  "Priya T.",
  "Bikash L.",
  "Sunita D.",
  "Deepak R.",
  "Maya P.",
];

export default function MultiOutletTab() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newOutlet, setNewOutlet] = useState({
    name: "",
    location: "",
    description: "",
    openTime: "08:00",
    closeTime: "22:00",
    menuCategories: [] as string[],
    assignedStaff: [] as string[],
  });

  const toggleOutlet = (id: string) => {
    setOutlets((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isActive: !o.isActive } : o))
    );
  };

  const deleteOutlet = (id: string) => {
    setOutlets((prev) => prev.filter((o) => o.id !== id));
  };

  const toggleCategory = (category: string) => {
    setNewOutlet((prev) => ({
      ...prev,
      menuCategories: prev.menuCategories.includes(category)
        ? prev.menuCategories.filter((c) => c !== category)
        : [...prev.menuCategories, category],
    }));
  };

  const toggleStaff = (staff: string) => {
    setNewOutlet((prev) => ({
      ...prev,
      assignedStaff: prev.assignedStaff.includes(staff)
        ? prev.assignedStaff.filter((s) => s !== staff)
        : [...prev.assignedStaff, staff],
    }));
  };

  const toggleOutletCategory = (outletId: string, category: string) => {
    setOutlets((prev) =>
      prev.map((o) =>
        o.id === outletId
          ? {
              ...o,
              menuCategories: o.menuCategories.includes(category)
                ? o.menuCategories.filter((c) => c !== category)
                : [...o.menuCategories, category],
            }
          : o
      )
    );
  };

  const toggleOutletStaff = (outletId: string, staff: string) => {
    setOutlets((prev) =>
      prev.map((o) =>
        o.id === outletId
          ? {
              ...o,
              assignedStaff: o.assignedStaff.includes(staff)
                ? o.assignedStaff.filter((s) => s !== staff)
                : [...o.assignedStaff, staff],
            }
          : o
      )
    );
  };

  const submitNewOutlet = () => {
    if (!newOutlet.name || !newOutlet.location) return;
    const outlet: Outlet = {
      id: `o${Date.now()}`,
      name: newOutlet.name,
      location: newOutlet.location,
      description: newOutlet.description,
      operatingHours: { open: newOutlet.openTime, close: newOutlet.closeTime },
      isActive: true,
      menuCategories: newOutlet.menuCategories,
      assignedStaff: newOutlet.assignedStaff,
      todayRevenue: 0,
      totalOrders: 0,
    };
    setOutlets((prev) => [...prev, outlet]);
    setNewOutlet({
      name: "",
      location: "",
      description: "",
      openTime: "08:00",
      closeTime: "22:00",
      menuCategories: [],
      assignedStaff: [],
    });
    setShowAddForm(false);
  };

  const totalRevenue = outlets.reduce((s, o) => s + o.todayRevenue, 0);
  const totalOrders = outlets.reduce((s, o) => s + o.totalOrders, 0);
  const activeCount = outlets.filter((o) => o.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">
            Multi-Outlet Management
          </h2>
          <p className="text-sm text-stone-500">
            Manage all dining outlets across your resort
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Add Outlet
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Outlets",
            value: outlets.length,
            icon: Store,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Active Now",
            value: activeCount,
            icon: MapPin,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Today's Revenue",
            value: `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Total Orders",
            value: totalOrders,
            icon: UtensilsCrossed,
            color: "text-blue-600",
            bg: "bg-blue-50",
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

      {/* Outlet Cards */}
      <div className="space-y-4">
        {outlets.map((outlet) => (
          <motion.div
            key={outlet.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${outlet.isActive ? "bg-amber-100" : "bg-stone-100"}`}
                  >
                    <Store
                      className={`h-6 w-6 ${outlet.isActive ? "text-amber-700" : "text-stone-400"}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-800">
                        {outlet.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          outlet.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {outlet.isActive ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {outlet.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {outlet.operatingHours.open} -{" "}
                        {outlet.operatingHours.close}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Revenue Badge */}
                  <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-right">
                    <p className="text-xs text-stone-500">Revenue</p>
                    <p className="text-sm font-bold text-emerald-700">
                      ${outlet.todayRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-right">
                    <p className="text-xs text-stone-500">Orders</p>
                    <p className="text-sm font-bold text-blue-700">
                      {outlet.totalOrders}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleOutlet(outlet.id)}
                    className="ml-2"
                    title={outlet.isActive ? "Close outlet" : "Open outlet"}
                  >
                    {outlet.isActive ? (
                      <ToggleRight className="h-7 w-7 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-stone-300" />
                    )}
                  </button>

                  <button
                    onClick={() => deleteOutlet(outlet.id)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === outlet.id ? null : outlet.id
                      )
                    }
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"
                  >
                    {expandedId === outlet.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {outlet.description && (
                <p className="mt-2 text-sm text-stone-500 ml-16">
                  {outlet.description}
                </p>
              )}
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedId === outlet.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-stone-100 overflow-hidden"
                >
                  <div className="p-5 space-y-5">
                    {/* Menu Categories */}
                    <div>
                      <p className="mb-2 text-sm font-medium text-stone-700 flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                        Menu Categories
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_CATEGORIES.map((cat) => {
                          const active = outlet.menuCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              onClick={() =>
                                toggleOutletCategory(outlet.id, cat)
                              }
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                active
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-stone-100 text-stone-400"
                              }`}
                            >
                              {active ? (
                                <CheckSquare className="h-3.5 w-3.5" />
                              ) : (
                                <Square className="h-3.5 w-3.5" />
                              )}
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Staff Assignment */}
                    <div>
                      <p className="mb-2 text-sm font-medium text-stone-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Assigned Staff
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_STAFF.map((staff) => {
                          const assigned =
                            outlet.assignedStaff.includes(staff);
                          return (
                            <button
                              key={staff}
                              onClick={() =>
                                toggleOutletStaff(outlet.id, staff)
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                assigned
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-stone-100 text-stone-400"
                              }`}
                            >
                              {staff}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Add Outlet Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowAddForm(false)}
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
                  Add New Outlet
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Outlet Name
                  </label>
                  <input
                    type="text"
                    value={newOutlet.name}
                    onChange={(e) =>
                      setNewOutlet((o) => ({ ...o, name: e.target.value }))
                    }
                    placeholder="e.g., Rooftop Lounge"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newOutlet.location}
                    onChange={(e) =>
                      setNewOutlet((o) => ({ ...o, location: e.target.value }))
                    }
                    placeholder="e.g., Main Building, 5th Floor"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Description
                  </label>
                  <textarea
                    value={newOutlet.description}
                    onChange={(e) =>
                      setNewOutlet((o) => ({
                        ...o,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this outlet..."
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Open Time
                    </label>
                    <input
                      type="time"
                      value={newOutlet.openTime}
                      onChange={(e) =>
                        setNewOutlet((o) => ({
                          ...o,
                          openTime: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Close Time
                    </label>
                    <input
                      type="time"
                      value={newOutlet.closeTime}
                      onChange={(e) =>
                        setNewOutlet((o) => ({
                          ...o,
                          closeTime: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Menu Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map((cat) => {
                      const selected = newOutlet.menuCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "bg-amber-100 text-amber-700"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Assign Staff
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STAFF.map((staff) => {
                      const selected = newOutlet.assignedStaff.includes(staff);
                      return (
                        <button
                          key={staff}
                          onClick={() => toggleStaff(staff)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "bg-blue-100 text-blue-700"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }`}
                        >
                          {staff}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={submitNewOutlet}
                  disabled={!newOutlet.name || !newOutlet.location}
                  className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Outlet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
