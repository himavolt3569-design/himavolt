"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Cake,
  User,
  Phone,
  Calendar,
  Image,
  DollarSign,
  ChevronRight,
  Layers,
  Palette,
  FileText,
  Wheat,
  Leaf,
  EggOff,
  Search,
  Grid3X3,
  List,
  Calculator,
} from "lucide-react";

interface CustomCakeOrder {
  id: string;
  customerName: string;
  phone: string;
  cakeSize: string;
  layers: number;
  flavor: string;
  frostingType: string;
  decorationNotes: string;
  referenceImage: string | null;
  deliveryDate: string;
  dietaryNeeds: string[];
  status: CakeStatus;
  price: number;
  createdAt: string;
}

type CakeStatus =
  | "Order Received"
  | "Design Approved"
  | "Baking"
  | "Decorating"
  | "Ready"
  | "Delivered";

const CAKE_SIZES = ['6"', '8"', '10"', '12"', "Custom"];
const FLAVORS = ["Vanilla", "Chocolate", "Red Velvet", "Lemon", "Carrot", "Custom"];
const FROSTING_TYPES = ["Buttercream", "Fondant", "Cream Cheese", "Whipped Cream"];
const DIETARY_OPTIONS = ["Eggless", "Vegan", "Gluten-Free"];

const STATUS_FLOW: CakeStatus[] = [
  "Order Received",
  "Design Approved",
  "Baking",
  "Decorating",
  "Ready",
  "Delivered",
];

const STATUS_COLORS: Record<CakeStatus, string> = {
  "Order Received": "bg-blue-100 text-blue-700 border-blue-200",
  "Design Approved": "bg-purple-100 text-purple-700 border-purple-200",
  Baking: "bg-orange-100 text-orange-700 border-orange-200",
  Decorating: "bg-pink-100 text-pink-700 border-pink-200",
  Ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Delivered: "bg-gray-100 text-gray-500 border-gray-200",
};

const SIZE_PRICES: Record<string, number> = {
  '6"': 35,
  '8"': 50,
  '10"': 70,
  '12"': 95,
  Custom: 80,
};

const LAYER_MULTIPLIER: Record<number, number> = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5,
  5: 3,
};

const PAST_GALLERY: { id: number; name: string; size: string; layers: number }[] = [];

export default function CustomCakesTab() {
  const [orders, setOrders] = useState<CustomCakeOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CakeStatus | "All">("All");

  // Form state
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    cakeSize: "" as string,
    layers: 1,
    flavor: "",
    frostingType: "",
    decorationNotes: "",
    deliveryDate: "",
    dietaryNeeds: [] as string[],
  });

  const calculatePrice = (size: string, layers: number) => {
    const base = SIZE_PRICES[size] || 50;
    const mult = LAYER_MULTIPLIER[layers] || 1;
    return base * mult;
  };

  const computedPrice = form.cakeSize ? calculatePrice(form.cakeSize, form.layers) : 0;

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = () => {
    if (!form.customerName || !form.cakeSize || !form.flavor || !form.deliveryDate) return;
    const newOrder: CustomCakeOrder = {
      id: `CC-${String(orders.length + 1).padStart(3, "0")}`,
      ...form,
      referenceImage: null,
      status: "Order Received",
      price: computedPrice,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setOrders([newOrder, ...orders]);
    setForm({
      customerName: "",
      phone: "",
      cakeSize: "",
      layers: 1,
      flavor: "",
      frostingType: "",
      decorationNotes: "",
      deliveryDate: "",
      dietaryNeeds: [],
    });
    setShowForm(false);
  };

  const advanceStatus = (id: string) => {
    setOrders(
      orders.map((o) => {
        if (o.id !== id) return o;
        const idx = STATUS_FLOW.indexOf(o.status);
        if (idx < STATUS_FLOW.length - 1) {
          return { ...o, status: STATUS_FLOW[idx + 1] };
        }
        return o;
      })
    );
  };

  const toggleDietary = (option: string) => {
    setForm((prev) => ({
      ...prev,
      dietaryNeeds: prev.dietaryNeeds.includes(option)
        ? prev.dietaryNeeds.filter((d) => d !== option)
        : [...prev.dietaryNeeds, option],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Custom Cakes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage custom cake orders with detailed specifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors text-sm font-medium"
          >
            <Grid3X3 className="w-4 h-4" />
            Gallery
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Cake Order
          </button>
        </div>
      </div>

      {/* Price Calculator Quick Ref */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100 p-4"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-rose-500" />
          Quick Price Reference
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {CAKE_SIZES.map((size) => (
            <div key={size} className="text-center bg-white rounded-lg p-2 border border-rose-100">
              <p className="text-sm font-bold text-gray-800">{size}</p>
              <p className="text-xs text-gray-500">from ${SIZE_PRICES[size]}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          * Layer multipliers: 2 layers = 1.5x, 3 layers = 2x, 4 layers = 2.5x, 5 layers = 3x
        </p>
      </motion.div>

      {/* Status Workflow */}
      <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Order Workflow
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.map((status, i) => (
            <div key={status} className="flex items-center">
              <span
                className={`text-[11px] px-3 py-1.5 rounded-full border font-medium whitespace-nowrap ${STATUS_COLORS[status]}`}
              >
                {status}
              </span>
              {i < STATUS_FLOW.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 mx-0.5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cake orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CakeStatus | "All")}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        >
          <option value="All">All Status</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-xl border border-rose-100"
            >
              <Cake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No cake orders found</p>
            </motion.div>
          ) : (
            filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-rose-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-gray-400">{order.id}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {order.status}
                      </span>
                      {order.dietaryNeeds.map((d) => (
                        <span
                          key={d}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium"
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <User className="w-4 h-4 text-rose-400" />
                      {order.customerName}
                      <span className="text-xs text-gray-400 font-normal flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {order.phone}
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div className="bg-rose-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Size</p>
                        <p className="text-sm font-semibold text-gray-700">{order.cakeSize}</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Layers</p>
                        <p className="text-sm font-semibold text-gray-700">{order.layers}</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Flavor</p>
                        <p className="text-sm font-semibold text-gray-700">{order.flavor}</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Frosting
                        </p>
                        <p className="text-sm font-semibold text-gray-700">{order.frostingType}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
                      <Palette className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-pink-400" />
                      {order.decorationNotes}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[130px]">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {order.deliveryDate}
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      ${order.price.toFixed(2)}
                    </p>
                    {order.status !== "Delivered" && (
                      <button
                        onClick={() => advanceStatus(order.id)}
                        className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 font-medium"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Gallery */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-rose-500" />
                Past Custom Cakes Gallery
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAST_GALLERY.map((cake) => (
                  <div
                    key={cake.id}
                    className="aspect-square bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex flex-col items-center justify-center border border-rose-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <Cake className="w-10 h-10 text-rose-300 mb-2" />
                    <p className="text-xs font-medium text-gray-700 text-center px-2">
                      {cake.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {cake.size} / {cake.layers} layers
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Cake Order Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">New Custom Cake Order</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Cake Size *
                  </label>
                  <div className="flex gap-2">
                    {CAKE_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setForm({ ...form, cakeSize: size })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.cakeSize === size
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Layers: {form.layers}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={form.layers}
                    onChange={(e) => setForm({ ...form, layers: Number(e.target.value) })}
                    className="w-full accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Flavor *</label>
                  <div className="flex flex-wrap gap-2">
                    {FLAVORS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setForm({ ...form, flavor: f })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.flavor === f
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Frosting Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FROSTING_TYPES.map((f) => (
                      <button
                        key={f}
                        onClick={() => setForm({ ...form, frostingType: f })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.frostingType === f
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Decoration Description
                  </label>
                  <textarea
                    value={form.decorationNotes}
                    onChange={(e) => setForm({ ...form, decorationNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                    placeholder="Describe the decoration, theme, colors..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Reference Image
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-rose-300 transition-colors cursor-pointer">
                    <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Click to upload reference image</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Delivery/Pickup Date *
                  </label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Dietary Needs
                  </label>
                  <div className="flex gap-3">
                    {DIETARY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => toggleDietary(opt)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                          form.dietaryNeeds.includes(opt)
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                        }`}
                      >
                        {opt === "Eggless" && <EggOff className="w-3 h-3" />}
                        {opt === "Vegan" && <Leaf className="w-3 h-3" />}
                        {opt === "Gluten-Free" && <Wheat className="w-3 h-3" />}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Preview */}
                {form.cakeSize && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs text-gray-500">Estimated Price</p>
                      <p className="text-xs text-gray-400">
                        {form.cakeSize} base (${SIZE_PRICES[form.cakeSize]}) x{" "}
                        {LAYER_MULTIPLIER[form.layers]}x ({form.layers} layer
                        {form.layers > 1 ? "s" : ""})
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-rose-600">${computedPrice.toFixed(2)}</p>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="px-5 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
                >
                  Create Cake Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
