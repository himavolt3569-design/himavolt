"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  Plus,
  X,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Merge,
  Split,
  Trash2,
  History,
  DollarSign,
  Timer,
} from "lucide-react";

interface Tab {
  id: string;
  customerName: string;
  tableNumber: number;
  items: TabItem[];
  runningTotal: number;
  timeOpened: string;
  minutesOpen: number;
  status: "Open" | "Settling" | "Closed";
  limit: number | null;
}

interface TabItem {
  name: string;
  price: number;
  quantity: number;
}

interface ClosedTab {
  id: string;
  customerName: string;
  tableNumber: number;
  total: number;
  closedAt: string;
  paymentMethod: string;
}

const MENU_ITEMS = [
  { name: "House Lager", price: 450 },
  { name: "Craft IPA", price: 600 },
  { name: "Margarita", price: 750 },
  { name: "Mojito", price: 700 },
  { name: "Old Fashioned", price: 850 },
  { name: "Red Wine Glass", price: 550 },
  { name: "Whiskey Sour", price: 800 },
  { name: "Nachos", price: 500 },
  { name: "Wings Platter", price: 650 },
  { name: "Fries", price: 300 },
];

export default function TabManagementTab() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [closedTabs] = useState<ClosedTab[]>([]);
  const [showNewTabForm, setShowNewTabForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [showHistory, setShowHistory] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [tabLongThreshold] = useState(90);

  const [newTab, setNewTab] = useState({ customerName: "", tableNumber: "", limit: "" });

  const openTabs = tabs.filter((t) => t.status !== "Closed");
  const alertTabs = tabs.filter(
    (t) =>
      t.status === "Open" &&
      ((t.limit && t.runningTotal >= t.limit * 0.8) || t.minutesOpen >= tabLongThreshold)
  );

  const createTab = () => {
    if (!newTab.customerName.trim() || !newTab.tableNumber) return;
    const tab: Tab = {
      id: Date.now().toString(),
      customerName: newTab.customerName.trim(),
      tableNumber: parseInt(newTab.tableNumber),
      items: [],
      runningTotal: 0,
      timeOpened: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      minutesOpen: 0,
      status: "Open",
      limit: newTab.limit ? parseInt(newTab.limit) : null,
    };
    setTabs((prev) => [...prev, tab]);
    setNewTab({ customerName: "", tableNumber: "", limit: "" });
    setShowNewTabForm(false);
  };

  const addItemToTab = (tabId: string, menuItem: { name: string; price: number }) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        const existingIdx = tab.items.findIndex((i) => i.name === menuItem.name);
        let newItems: TabItem[];
        if (existingIdx >= 0) {
          newItems = tab.items.map((item, idx) =>
            idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newItems = [...tab.items, { ...menuItem, quantity: 1 }];
        }
        return {
          ...tab,
          items: newItems,
          runningTotal: newItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
        };
      })
    );
  };

  const settleTab = (tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, status: "Settling" as const } : tab))
    );
    setSelectedTab(tabId);
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, status: "Closed" as const } : tab))
    );
    setSelectedTab(null);
  };

  const mergeTabs = () => {
    if (selectedForMerge.length < 2) return;
    const mergingTabs = tabs.filter((t) => selectedForMerge.includes(t.id));
    const firstTab = mergingTabs[0];
    const mergedItems: TabItem[] = [];
    mergingTabs.forEach((tab) => {
      tab.items.forEach((item) => {
        const existing = mergedItems.find((i) => i.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedItems.push({ ...item });
        }
      });
    });
    const mergedTab: Tab = {
      ...firstTab,
      customerName: `Merged: ${mergingTabs.map((t) => t.customerName).join(" + ")}`,
      items: mergedItems,
      runningTotal: mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    };
    setTabs((prev) => [
      ...prev.filter((t) => !selectedForMerge.includes(t.id)),
      mergedTab,
    ]);
    setSelectedForMerge([]);
  };

  const toggleMergeSelection = (id: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selected = tabs.find((t) => t.id === selectedTab);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AnimatePresence>
        {alertTabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h4 className="text-amber-400 font-medium">Tab Alerts</h4>
            </div>
            <div className="space-y-1">
              {alertTabs.map((tab) => (
                <p key={tab.id} className="text-amber-300/80 text-sm">
                  {tab.limit && tab.runningTotal >= tab.limit * 0.8
                    ? `${tab.customerName} (Table ${tab.tableNumber}) - Approaching limit: Rs ${tab.runningTotal}/${tab.limit}`
                    : `${tab.customerName} (Table ${tab.tableNumber}) - Open for ${tab.minutesOpen} minutes`}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            Active Tabs ({openTabs.length})
          </h3>
          {selectedForMerge.length >= 2 && (
            <button
              onClick={mergeTabs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Merge className="w-3.5 h-3.5" />
              Merge ({selectedForMerge.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <button
            onClick={() => setShowNewTabForm(!showNewTabForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Open Tab
          </button>
        </div>
      </div>

      {/* New Tab Form */}
      <AnimatePresence>
        {showNewTabForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-800/80 rounded-xl p-5 border border-zinc-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Open New Tab</h4>
                <button onClick={() => setShowNewTabForm(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Customer Name</label>
                  <input
                    type="text"
                    value={newTab.customerName}
                    onChange={(e) => setNewTab((prev) => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Name"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Table Number</label>
                  <input
                    type="number"
                    value={newTab.tableNumber}
                    onChange={(e) => setNewTab((prev) => ({ ...prev, tableNumber: e.target.value }))}
                    placeholder="Table #"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Limit (optional)</label>
                  <input
                    type="number"
                    value={newTab.limit}
                    onChange={(e) => setNewTab((prev) => ({ ...prev, limit: e.target.value }))}
                    placeholder="Max Rs"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <button
                onClick={createTab}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors"
              >
                Open Tab
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs List */}
      <div className="space-y-3">
        {openTabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-zinc-800/80 rounded-xl border ${
              selectedForMerge.includes(tab.id)
                ? "border-purple-500"
                : tab.status === "Settling"
                ? "border-amber-500/50"
                : "border-zinc-700/50"
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleMergeSelection(tab.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedForMerge.includes(tab.id)
                        ? "border-purple-500 bg-purple-500"
                        : "border-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {selectedForMerge.includes(tab.id) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-white font-medium">{tab.customerName}</h4>
                    <p className="text-zinc-400 text-sm">
                      Table {tab.tableNumber} &middot; Opened {tab.timeOpened}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tab.status === "Open"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : tab.status === "Settling"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-600/20 text-zinc-400"
                    }`}
                  >
                    {tab.status}
                  </span>
                  <div className="flex items-center gap-1 text-zinc-400 text-sm">
                    <Timer className="w-3.5 h-3.5" />
                    {tab.minutesOpen}m
                  </div>
                </div>
              </div>

              {/* Items */}
              {tab.items.length > 0 && (
                <div className="mb-3 space-y-1">
                  {tab.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-zinc-300">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-zinc-400">Rs {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                <div>
                  <p className="text-white font-bold text-lg">Rs {tab.runningTotal.toLocaleString()}</p>
                  {tab.limit && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1.5 bg-zinc-700 rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            tab.runningTotal / tab.limit >= 0.8 ? "bg-red-500" : "bg-rose-400"
                          }`}
                          style={{ width: `${Math.min((tab.runningTotal / tab.limit) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs">
                        {Math.round((tab.runningTotal / tab.limit) * 100)}% of Rs {tab.limit.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowItemSelector(showItemSelector === tab.id ? null : tab.id)
                    }
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Add Item
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTab(tab.id);
                      setShowSplitModal(true);
                    }}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                  >
                    <Split className="w-3.5 h-3.5 inline mr-1" />
                    Split
                  </button>
                  {tab.status === "Open" ? (
                    <button
                      onClick={() => settleTab(tab.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Settle
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      {[
                        { icon: Banknote, label: "Cash" },
                        { icon: CreditCard, label: "Card" },
                        { icon: Smartphone, label: "eSewa" },
                      ].map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          onClick={() => closeTab(tab.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                          title={label}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Item Selector */}
            <AnimatePresence>
              {showItemSelector === tab.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-zinc-700/50"
                >
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {MENU_ITEMS.filter((i) =>
                        i.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((item) => (
                        <button
                          key={item.name}
                          onClick={() => addItemToTab(tab.id, item)}
                          className="bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-2 text-left transition-colors"
                        >
                          <p className="text-white text-xs font-medium truncate">{item.name}</p>
                          <p className="text-zinc-400 text-xs">Rs {item.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Split Bill Modal */}
      <AnimatePresence>
        {showSplitModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSplitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-800 rounded-xl p-6 w-full max-w-md border border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Split className="w-5 h-5 text-rose-400" />
                Split Bill - {selected.customerName}
              </h4>
              <p className="text-zinc-400 text-sm mb-4">
                Total: Rs {selected.runningTotal.toLocaleString()}
              </p>
              <div className="mb-4">
                <label className="text-zinc-400 text-sm mb-2 block">Split between</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                    className="w-10 h-10 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium"
                  >
                    -
                  </button>
                  <span className="text-white text-2xl font-bold w-12 text-center">{splitCount}</span>
                  <button
                    onClick={() => setSplitCount(splitCount + 1)}
                    className="w-10 h-10 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium"
                  >
                    +
                  </button>
                  <span className="text-zinc-400 text-sm">people</span>
                </div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 mb-4">
                <p className="text-zinc-400 text-sm">Each person pays</p>
                <p className="text-rose-400 text-2xl font-bold">
                  Rs {Math.ceil(selected.runningTotal / splitCount).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2.5 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSplitModal(false);
                    settleTab(selected.id);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors"
                >
                  Apply Split
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-rose-400" />
                Recently Closed Tabs
              </h3>
              <div className="space-y-2">
                {closedTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="bg-zinc-800/80 rounded-xl p-3 border border-zinc-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-white text-sm font-medium">{tab.customerName}</p>
                        <p className="text-zinc-400 text-xs">
                          Table {tab.tableNumber} &middot; Closed at {tab.closedAt}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">Rs {tab.total.toLocaleString()}</p>
                      <p className="text-zinc-400 text-xs">{tab.paymentMethod}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
