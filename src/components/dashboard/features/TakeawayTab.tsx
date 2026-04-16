"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Package,
  Truck,
  Plus,
  Trash2,
  Printer,
  Clock,
  Hash,
  ExternalLink,
  Check,
  Loader2,
  Timer,
  Leaf,
  Box,
  X,
  MapPin,
} from "lucide-react";

interface PackagingOption {
  id: string;
  name: string;
  costPerUnit: number;
  active: boolean;
  ecoFriendly: boolean;
}

interface DeliveryPartner {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  statusLabel: string;
}

interface TakeawayOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: string;
  packaging: string;
  packagingStatus: "Pending" | "Packing" | "Packed" | "Picked Up";
  prepTime: number; // minutes
  counter: string;
  createdAt: string;
}

export default function TakeawayTab() {
  const [takeawayEnabled, setTakeawayEnabled] = useState(true);
  const [printLabelEnabled, setPrintLabelEnabled] = useState(true);
  const [avgPrepTime, setAvgPrepTime] = useState(10);
  const [pickupCounter, setPickupCounter] = useState("Pickup 1");
  const [packaging, setPackaging] = useState<PackagingOption[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [orders, setOrders] = useState<TakeawayOrder[]>([]);

  const [showAddPackaging, setShowAddPackaging] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgCost, setNewPkgCost] = useState("");
  const [newPkgEco, setNewPkgEco] = useState(false);

  const activeOrders = orders.filter((o) => o.packagingStatus !== "Picked Up");

  const togglePackaging = (id: string) => {
    setPackaging((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const removePackaging = (id: string) => {
    setPackaging((prev) => prev.filter((p) => p.id !== id));
  };

  const addPackaging = () => {
    if (!newPkgName.trim() || !newPkgCost) return;
    setPackaging((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newPkgName.trim(), costPerUnit: Number(newPkgCost), active: true, ecoFriendly: newPkgEco },
    ]);
    setNewPkgName("");
    setNewPkgCost("");
    setNewPkgEco(false);
    setShowAddPackaging(false);
  };

  const togglePartner = (id: string) => {
    setPartners((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, connected: !p.connected, statusLabel: !p.connected ? "Connected" : "Not Connected" }
          : p
      )
    );
  };

  const advanceOrder = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const next: Record<string, TakeawayOrder["packagingStatus"]> = {
          Pending: "Packing",
          Packing: "Packed",
          Packed: "Picked Up",
        };
        return { ...o, packagingStatus: next[o.packagingStatus] || o.packagingStatus };
      })
    );
  };

  const statusStyle = (status: TakeawayOrder["packagingStatus"]) => {
    switch (status) {
      case "Pending":
        return "bg-[var(--surface)] text-[var(--text-2)]";
      case "Packing":
        return "bg-[var(--accent-muted)] text-[var(--accent-text)]";
      case "Packed":
        return "bg-[var(--accent-muted)] text-[#b25c1c]";
      case "Picked Up":
        return "bg-blue-100 text-blue-600";
    }
  };

  const statusIcon = (status: TakeawayOrder["packagingStatus"]) => {
    switch (status) {
      case "Pending":
        return <Clock className="w-3.5 h-3.5" />;
      case "Packing":
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case "Packed":
        return <Check className="w-3.5 h-3.5" />;
      case "Picked Up":
        return <ShoppingBag className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-muted)] rounded-xl">
            <ShoppingBag className="w-6 h-6 text-[var(--accent-text)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Takeaway</h2>
            <p className="text-sm text-[var(--text-2)]">Streamlined packaging & delivery management</p>
          </div>
        </div>
        <button
          onClick={() => setTakeawayEnabled(!takeawayEnabled)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {takeawayEnabled ? (
            <ToggleRight className="w-8 h-8 text-[var(--accent)]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-[var(--text-3)]" />
          )}
          <span className={takeawayEnabled ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}>
            {takeawayEnabled ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      {takeawayEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Active Orders", value: activeOrders.length, icon: Package, color: "text-[var(--accent-text)] bg-[var(--accent-muted)]" },
              { label: "Avg Prep Time", value: `${avgPrepTime} min`, icon: Timer, color: "text-[var(--accent)] bg-[var(--accent)]" },
              { label: "Pickup Counter", value: pickupCounter, icon: MapPin, color: "text-blue-600 bg-blue-50" },
              { label: "Print Labels", value: printLabelEnabled ? "On" : "Off", icon: Printer, color: "text-[#b25c1c] bg-[var(--accent-muted)]" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{stat.label}</p>
                    <p className="text-lg font-bold text-[var(--text-1)]">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Prep Time & Labels */}
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Settings</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[var(--accent)]" />
                  Avg Preparation Time (min)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={avgPrepTime}
                    onChange={(e) => setAvgPrepTime(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span className="text-lg font-bold text-[var(--accent-text)] w-10 text-center">{avgPrepTime}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--accent)]" />
                  Pickup Counter
                </label>
                <select
                  value={pickupCounter}
                  onChange={(e) => setPickupCounter(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                >
                  <option>Pickup 1</option>
                  <option>Pickup 2</option>
                  <option>Pickup 3</option>
                  <option>Main Counter</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
                <span className="text-sm font-medium text-[var(--text-2)] flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[var(--accent)]" />
                  Print Label / Receipt
                </span>
                <button onClick={() => setPrintLabelEnabled(!printLabelEnabled)}>
                  {printLabelEnabled ? (
                    <ToggleRight className="w-7 h-7 text-[var(--accent)]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[var(--text-3)]" />
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Packaging Options</h3>
                <button
                  onClick={() => setShowAddPackaging(!showAddPackaging)}
                  className="p-1.5 bg-[var(--accent-muted)] text-[var(--accent-text)] rounded-lg hover:bg-[var(--accent-muted)] transition-colors"
                >
                  {showAddPackaging ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <AnimatePresence>
                {showAddPackaging && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[var(--accent-muted)] rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Package name"
                          value={newPkgName}
                          onChange={(e) => setNewPkgName(e.target.value)}
                          className="flex-1 border border-[var(--accent-border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                        />
                        <input
                          type="number"
                          placeholder="Cost (Rs)"
                          value={newPkgCost}
                          onChange={(e) => setNewPkgCost(e.target.value)}
                          className="w-28 border border-[var(--accent-border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPkgEco}
                            onChange={(e) => setNewPkgEco(e.target.checked)}
                            className="accent-green-500"
                          />
                          <Leaf className="w-3.5 h-3.5 text-[#d67620]" />
                          Eco-Friendly
                        </label>
                        <button
                          onClick={addPackaging}
                          disabled={!newPkgName.trim() || !newPkgCost}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <AnimatePresence>
                  {packaging.map((pkg) => (
                    <motion.div
                      key={pkg.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center justify-between bg-[var(--canvas-sub)] rounded-lg px-3 py-2.5 ${
                        !pkg.active ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-[var(--accent)]" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[var(--text-1)]">{pkg.name}</span>
                            {pkg.ecoFriendly && (
                              <Leaf className="w-3 h-3 text-[#d67620]" />
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-3)]">Rs {pkg.costPerUnit}/unit</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => togglePackaging(pkg.id)}>
                          {pkg.active ? (
                            <ToggleRight className="w-6 h-6 text-[var(--accent)]" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-[var(--text-3)]" />
                          )}
                        </button>
                        <button
                          onClick={() => removePackaging(pkg.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Delivery Partners</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {partners.map((partner) => (
                <motion.div
                  key={partner.id}
                  whileHover={{ y: -2 }}
                  className={`border rounded-xl p-4 text-center transition-colors ${
                    partner.connected
                      ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
                      : "border-[var(--border)] bg-[var(--canvas-sub)]"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-sm font-bold ${
                      partner.connected
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-alt)] text-[var(--text-2)]"
                    }`}
                  >
                    {partner.logo}
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{partner.name}</p>
                  <p
                    className={`text-xs mt-1 ${
                      partner.connected ? "text-[#b25c1c]" : "text-[var(--text-3)]"
                    }`}
                  >
                    {partner.statusLabel}
                  </p>
                  <button
                    onClick={() => togglePartner(partner.id)}
                    className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      partner.connected
                        ? "bg-[var(--canvas)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:bg-[var(--accent-muted)]"
                        : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    }`}
                  >
                    {partner.connected ? "Disconnect" : "Connect"}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Takeaway Order Queue</h3>
              <span className="text-xs text-[var(--text-3)]">{activeOrders.length} active orders</span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              <AnimatePresence>
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                        <Hash className="w-4 h-4 text-[var(--accent-text)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-1)]">{order.orderNumber}</span>
                          <span className="text-xs text-[var(--text-3)]">&middot;</span>
                          <span className="text-sm text-[var(--text-2)]">{order.customerName}</span>
                        </div>
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          {order.items} &middot; {order.packaging} &middot; {order.counter} &middot; {order.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="text-xs text-[var(--text-3)]">Prep time</span>
                        <p className="text-sm font-semibold text-[var(--text-2)]">{order.prepTime} min</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle(
                          order.packagingStatus
                        )}`}
                      >
                        {statusIcon(order.packagingStatus)}
                        {order.packagingStatus}
                      </span>
                      {order.packagingStatus !== "Picked Up" && (
                        <button
                          onClick={() => advanceOrder(order.id)}
                          className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] rounded-lg transition-colors"
                          title="Advance status"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
