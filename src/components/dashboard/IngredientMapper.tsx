"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Package,
  Search,
  Trash2,
  Link2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface IngredientMapping {
  id: string;
  quantityUsed: number;
  menuItemId: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
}

interface IngredientMapperProps {
  menuItemId: string;
  restaurantId: string;
  onClose: () => void;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export default function IngredientMapper({
  menuItemId,
  restaurantId,
  onClose,
}: IngredientMapperProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mappings, setMappings] = useState<IngredientMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Track which inventory items are selected and their quantities
  const [selected, setSelected] = useState<
    Record<string, { checked: boolean; quantityUsed: number }>
  >({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, mappingData] = await Promise.all([
        apiFetch(`/api/restaurants/${restaurantId}/inventory`),
        apiFetch(
          `/api/restaurants/${restaurantId}/menu/${menuItemId}/ingredients`,
        ),
      ]);

      const inventoryItems: InventoryItem[] = (
        Array.isArray(inventoryData) ? inventoryData : []
      ).map((item: InventoryItem & { usedInMenuItems?: unknown }) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
      }));

      setInventory(inventoryItems);
      setMappings(Array.isArray(mappingData) ? mappingData : []);

      // Initialize selected state from existing mappings
      const initialSelected: Record<
        string,
        { checked: boolean; quantityUsed: number }
      > = {};
      for (const m of mappingData as IngredientMapping[]) {
        initialSelected[m.inventoryItemId] = {
          checked: true,
          quantityUsed: m.quantityUsed,
        };
      }
      setSelected(initialSelected);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [restaurantId, menuItemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleItem = (itemId: string) => {
    setSelected((prev) => {
      const current = prev[itemId];
      if (current?.checked) {
        // Uncheck — mark for deletion
        return { ...prev, [itemId]: { checked: false, quantityUsed: 0 } };
      }
      return {
        ...prev,
        [itemId]: { checked: true, quantityUsed: current?.quantityUsed || 1 },
      };
    });
  };

  const setQuantity = (itemId: string, qty: number) => {
    setSelected((prev) => ({
      ...prev,
      [itemId]: { checked: true, quantityUsed: Math.max(0.01, qty) },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find items to add/update (checked ones)
      const toUpsert = Object.entries(selected).filter(
        ([, v]) => v.checked && v.quantityUsed > 0,
      );
      // Find items to delete (unchecked ones that were previously mapped)
      const existingIds = new Set(mappings.map((m) => m.inventoryItemId));
      const toDelete = Object.entries(selected).filter(
        ([id, v]) => !v.checked && existingIds.has(id),
      );

      // Also delete mappings that exist but are no longer in selected at all
      for (const m of mappings) {
        if (!(m.inventoryItemId in selected)) {
          toDelete.push([m.inventoryItemId, { checked: false, quantityUsed: 0 }]);
        }
      }

      // Upsert ingredients
      for (const [inventoryItemId, { quantityUsed }] of toUpsert) {
        await apiFetch(
          `/api/restaurants/${restaurantId}/menu/${menuItemId}/ingredients`,
          {
            method: "POST",
            body: JSON.stringify({ inventoryItemId, quantityUsed }),
          },
        );
      }

      // Delete removed ingredients
      for (const [inventoryItemId] of toDelete) {
        await apiFetch(
          `/api/restaurants/${restaurantId}/menu/${menuItemId}/ingredients?ingredientId=`,
          {
            method: "DELETE",
            body: JSON.stringify({ inventoryItemId }),
          },
        );
      }

      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (mapping: IngredientMapping) => {
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/menu/${menuItemId}/ingredients?ingredientId=${mapping.id}`,
        { method: "DELETE" },
      );
      setMappings((prev) => prev.filter((m) => m.id !== mapping.id));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[mapping.inventoryItemId];
        return next;
      });
    } catch {
      // ignore
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 340,
          mass: 0.7,
        }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[90dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-100/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Link2 className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#3e1e0c]">
                Map Ingredients
              </h3>
              <p className="text-xs text-gray-500">
                Link inventory items to this menu item for auto stock deduction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-bold text-gray-500">No inventory items</p>
              <p className="text-sm text-gray-400 mt-1">
                Add items to your inventory first, then map them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search inventory items..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-[#3e1e0c] placeholder-gray-400 outline-none transition-all focus:border-[#eaa94d] focus:ring-2 focus:ring-[#eaa94d]/15"
                />
              </div>

              {/* Inventory items list */}
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredInventory.map((item) => {
                  const sel = selected[item.id];
                  const isChecked = sel?.checked ?? false;
                  const qty = sel?.quantityUsed ?? 1;
                  const existingMapping = mappings.find(
                    (m) => m.inventoryItemId === item.id,
                  );

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                        isChecked
                          ? "border-amber-300 bg-amber-50/40"
                          : "border-gray-100 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                          isChecked
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-gray-300 bg-white hover:border-amber-400"
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </button>

                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#3e1e0c] truncate">
                            {item.name}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold text-gray-400">
                            {item.quantity} {item.unit} in stock
                          </span>
                        </div>
                      </div>

                      {/* Quantity input (only when checked) */}
                      {isChecked && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={qty}
                            onChange={(e) =>
                              setQuantity(item.id, parseFloat(e.target.value) || 0.01)
                            }
                            className="w-20 rounded-lg border border-amber-300 bg-amber-50/50 px-2 py-1.5 text-xs font-bold text-[#3e1e0c] text-center outline-none focus:ring-2 focus:ring-amber-200"
                          />
                          <span className="text-[10px] font-semibold text-amber-600 w-6">
                            {item.unit}
                          </span>
                          {existingMapping && (
                            <button
                              onClick={() => handleDeleteMapping(existingMapping)}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                              title="Remove mapping"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredInventory.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">
                    No items match your search
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs text-gray-400">
            {Object.values(selected).filter((s) => s.checked).length} ingredients
            selected
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-[#3e1e0c] hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.97] ${
                !saving
                  ? "bg-amber-600 shadow-amber-600/20 hover:bg-amber-500"
                  : "bg-gray-300 shadow-none cursor-not-allowed"
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Mappings"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
