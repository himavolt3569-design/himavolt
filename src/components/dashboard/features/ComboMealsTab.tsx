"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Plus, X, Percent, ToggleLeft, ToggleRight,
  Tag, Trash2, Pencil, Check, Loader2, ImageIcon, Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface MenuItem { id: string; name: string; imageUrl: string | null; price: number }
interface ComboItem { name: string; quantity: number; menuItemId: string | null }
interface ComboMeal {
  id: string; name: string; description: string | null; imageUrl: string | null;
  comboPrice: number; originalPrice: number; isActive: boolean;
  items: (ComboItem & { id: string; menuItem: MenuItem | null })[];
}

export default function ComboMealsTab({ restaurantId }: { restaurantId?: string }) {
  if (!restaurantId) return null;
  const [combos, setCombos] = useState<ComboMeal[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formComboPrice, setFormComboPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formItems, setFormItems] = useState<{ menuItemId: string; name: string; quantity: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [combosData, menuData] = await Promise.all([
        apiFetch<ComboMeal[]>(`/api/restaurants/${restaurantId}/combo-meals`),
        apiFetch<{ items: MenuItem[] }>(`/api/public/restaurants/${restaurantId}/menu`).catch(() => ({ items: [] })),
      ]);
      setCombos(combosData);
      // Fall back to owner menu endpoint if public doesn't return items
      if ((menuData as { items?: MenuItem[] }).items?.length) {
        setMenuItems((menuData as { items: MenuItem[] }).items);
      } else {
        // Load from owner categories endpoint
        const cats = await apiFetch<{ items: MenuItem[] }[]>(`/api/restaurants/${restaurantId}/menu-items`).catch(() => []);
        const flat = Array.isArray(cats) ? cats.flatMap((c) => (c as unknown as { items?: MenuItem[] }).items ?? [c as unknown as MenuItem]) : [];
        setMenuItems(flat.filter((i) => i?.id));
      }
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Load actual menu items from the categories API
  const loadMenuItems = useCallback(async () => {
    try {
      const res = await apiFetch<Array<{ id: string; name: string; price: number; imageUrl: string | null }>>(
        `/api/restaurants/${restaurantId}/menu-items/all`,
      ).catch(() => null);
      if (res && Array.isArray(res)) { setMenuItems(res); return; }
      // Fallback: use public restaurant route which includes menu items
      const pub = await apiFetch<{ categories: Array<{ items: MenuItem[] }> }>(`/api/public/restaurants/${restaurantId}`).catch(() => null);
      if (pub?.categories) {
        setMenuItems(pub.categories.flatMap((c) => c.items ?? []));
      }
    } catch { /* ignore */ }
  }, [restaurantId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [combosData] = await Promise.all([
          apiFetch<ComboMeal[]>(`/api/restaurants/${restaurantId}/combo-meals`),
          loadMenuItems(),
        ]);
        setCombos(combosData);
      } finally {
        setLoading(false);
      }
    };
    if (restaurantId) init();
  }, [restaurantId, loadMenuItems]);

  const savings = (o: number, c: number) => o > c ? Math.round(((o - c) / o) * 100) : 0;

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormImageUrl("");
    setFormComboPrice(""); setFormOriginalPrice("");
    setFormItems([]); setEditingId(null); setShowForm(false); setItemSearch("");
  };

  const openEdit = (combo: ComboMeal) => {
    setFormName(combo.name); setFormDesc(combo.description ?? "");
    setFormImageUrl(combo.imageUrl ?? "");
    setFormComboPrice(String(combo.comboPrice));
    setFormOriginalPrice(String(combo.originalPrice));
    setFormItems(combo.items.map((i) => ({ menuItemId: i.menuItemId ?? "", name: i.name, quantity: i.quantity })));
    setEditingId(combo.id); setShowForm(true);
  };

  const toggleMenuItem = (item: MenuItem) => {
    setFormItems((prev) => {
      const exists = prev.find((i) => i.menuItemId === item.id);
      if (exists) return prev.filter((i) => i.menuItemId !== item.id);
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, qty: number) => {
    setFormItems((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const handleSubmit = async () => {
    if (!formName.trim() || formItems.length === 0 || !formComboPrice || !formOriginalPrice) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(), description: formDesc.trim() || null,
        imageUrl: formImageUrl.trim() || null,
        comboPrice: Number(formComboPrice), originalPrice: Number(formOriginalPrice),
        items: formItems,
      };
      if (editingId) {
        const updated = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals/${editingId}`, { method: "PATCH", body: payload });
        setCombos((prev) => prev.map((c) => c.id === editingId ? updated : c));
      } else {
        const created = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals`, { method: "POST", body: payload });
        setCombos((prev) => [created, ...prev]);
      }
      resetForm();
    } finally { setSaving(false); }
  };

  const toggleActive = async (combo: ComboMeal) => {
    const updated = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals/${combo.id}`, {
      method: "PATCH", body: { isActive: !combo.isActive },
    });
    setCombos((prev) => prev.map((c) => c.id === combo.id ? updated : c));
  };

  const deleteCombo = async (id: string) => {
    if (!confirm("Delete this combo deal?")) return;
    await apiFetch(`/api/restaurants/${restaurantId}/combo-meals/${id}`, { method: "DELETE" });
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredMenuItems = menuItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Combo Deals</h2>
            <p className="text-sm text-gray-500">Bundle menu items into value deals shown to customers</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Combo
        </button>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{editingId ? "Edit Combo" : "New Combo Deal"}</h3>
                <button onClick={resetForm}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Combo Name *</label>
                  <input type="text" placeholder="e.g. Family Feast" value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Short Description</label>
                  <input type="text" placeholder="e.g. Perfect for 2 people" value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Original Price (Rs) *</label>
                  <input type="number" placeholder="580" value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Combo Price (Rs) *</label>
                  <input type="number" placeholder="450" value={formComboPrice}
                    onChange={(e) => setFormComboPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Photo URL (optional)</label>
                <input type="url" placeholder="https://..." value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>

              {formComboPrice && formOriginalPrice && Number(formOriginalPrice) > Number(formComboPrice) && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  <Percent className="w-4 h-4" />
                  Customer saves {savings(Number(formOriginalPrice), Number(formComboPrice))}% — Rs {Number(formOriginalPrice) - Number(formComboPrice)} off
                </div>
              )}

              {/* Menu Item Picker */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-600">Select Menu Items *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search your menu..." value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>

                {menuItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No menu items found. Add items to your menu first.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {filteredMenuItems.map((item) => {
                      const selected = formItems.find((i) => i.menuItemId === item.id);
                      return (
                        <div key={item.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${selected ? "bg-orange-50" : ""}`}
                          onClick={() => toggleMenuItem(item)}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">Rs {item.price}</p>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => updateQty(item.id, selected.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-orange-100 rounded text-orange-600 font-bold text-sm hover:bg-orange-200">-</button>
                              <span className="text-sm font-bold text-gray-800 w-4 text-center">{selected.quantity}</span>
                              <button onClick={() => updateQty(item.id, selected.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-orange-100 rounded text-orange-600 font-bold text-sm hover:bg-orange-200">+</button>
                            </div>
                          )}
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {formItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formItems.map((i) => (
                      <span key={i.menuItemId} className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {i.quantity > 1 && <span className="font-bold">{i.quantity}×</span>}
                        {i.name}
                        <button onClick={() => setFormItems((prev) => prev.filter((p) => p.menuItemId !== i.menuItemId))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleSubmit} disabled={saving || !formName.trim() || formItems.length === 0 || !formComboPrice || !formOriginalPrice}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? "Update" : "Create"} Combo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {combos.map((combo) => (
            <motion.div key={combo.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white border rounded-xl shadow-sm transition-opacity ${combo.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
              {combo.imageUrl && (
                <img src={combo.imageUrl} alt={combo.name} className="w-full h-32 object-cover rounded-t-xl" />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{combo.name}</h4>
                    {combo.description && <p className="text-xs text-gray-400 mt-0.5">{combo.description}</p>}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold shrink-0">
                    <Tag className="w-3 h-3" />{savings(combo.originalPrice, combo.comboPrice)}% OFF
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {combo.items.map((item, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      {item.quantity > 1 && <span className="font-bold">{item.quantity}× </span>}{item.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">Rs {combo.comboPrice}</span>
                    <span className="text-sm text-gray-400 line-through">Rs {combo.originalPrice}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(combo)}>
                      {combo.isActive ? <ToggleRight className="w-7 h-7 text-orange-500" /> : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                    </button>
                    <span className={`text-xs font-medium ${combo.isActive ? "text-orange-600" : "text-gray-400"}`}>
                      {combo.isActive ? "Live on menu" : "Hidden"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(combo)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteCombo(combo.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {combos.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No combo deals yet</p>
          <p className="text-xs mt-1">Create your first combo to show customers bundled value deals</p>
        </div>
      )}
    </motion.div>
  );
}
