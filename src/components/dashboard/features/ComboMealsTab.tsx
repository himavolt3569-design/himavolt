"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Plus, X, Percent, ToggleLeft, ToggleRight,
  Tag, Trash2, Pencil, Check, Loader2, ImageIcon, Search,
} from "lucide-react";
import { apiFetch, peekApiCache } from "@/lib/api-client";

interface MenuItem { id: string; name: string; imageUrl: string | null; price: number }
interface ComboItem { name: string; quantity: number; menuItemId: string | null }
interface ComboMeal {
  id: string; name: string; description: string | null; imageUrl: string | null;
  comboPrice: number; originalPrice: number; isActive: boolean;
  items: (ComboItem & { id: string; menuItem: MenuItem | null })[];
}

export default function ComboMealsTab({ restaurantId }: { restaurantId?: string }) {
  // Seed from the warm GET cache so re-opening (or hovering then clicking) paints
  // instantly — no spinner — while the effect below revalidates in background.
  const combosPath = restaurantId ? `/api/restaurants/${restaurantId}/combo-meals` : "";
  const [combos, setCombos] = useState<ComboMeal[]>(() => peekApiCache<ComboMeal[]>(combosPath) ?? []);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(() => !peekApiCache(combosPath));
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");

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
    if (!restaurantId) return;
    const init = async () => {
      // Only block with a spinner on a cold cache — a warm tab already painted.
      if (!peekApiCache(combosPath)) setLoading(true);
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
    init();
  }, [restaurantId, loadMenuItems, combosPath]);

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
    const payload = {
      name: formName.trim(), description: formDesc.trim() || null,
      imageUrl: formImageUrl.trim() || null,
      comboPrice: Number(formComboPrice), originalPrice: Number(formOriginalPrice),
      items: formItems,
    };
    const editing = editingId;
    const snapshot = combos;
    // Optimistic items for instant render; real ids/menuItem reconcile on response.
    const optimisticItems = formItems.map((fi, i) => ({
      id: `tmp-${i}`, menuItemId: fi.menuItemId, name: fi.name, quantity: fi.quantity, menuItem: null,
    }));
    const tempId = `temp-${Date.now()}`;
    // Apply instantly and close the form — no spinner wait.
    if (editing) {
      setCombos((prev) => prev.map((c) => c.id === editing ? { ...c, ...payload, items: optimisticItems } as ComboMeal : c));
    } else {
      setCombos((prev) => [{ id: tempId, ...payload, isActive: true, items: optimisticItems } as ComboMeal, ...prev]);
    }
    resetForm();
    try {
      if (editing) {
        const updated = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals/${editing}`, { method: "PATCH", body: payload });
        setCombos((prev) => prev.map((c) => c.id === editing ? updated : c));
      } else {
        const created = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals`, { method: "POST", body: payload });
        setCombos((prev) => prev.map((c) => c.id === tempId ? created : c));
      }
    } catch {
      setCombos(snapshot); // rollback
    }
  };

  const toggleActive = async (combo: ComboMeal) => {
    const snapshot = combos;
    // Optimistic flip; reconcile with the server's row on success.
    setCombos((prev) => prev.map((c) => c.id === combo.id ? { ...c, isActive: !c.isActive } : c));
    try {
      const updated = await apiFetch<ComboMeal>(`/api/restaurants/${restaurantId}/combo-meals/${combo.id}`, {
        method: "PATCH", body: { isActive: !combo.isActive },
      });
      setCombos((prev) => prev.map((c) => c.id === combo.id ? updated : c));
    } catch {
      setCombos(snapshot); // rollback
    }
  };

  const deleteCombo = async (id: string) => {
    if (!confirm("Delete this combo deal?")) return;
    const snapshot = combos;
    setCombos((prev) => prev.filter((c) => c.id !== id)); // optimistic remove
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/combo-meals/${id}`, { method: "DELETE" });
    } catch {
      setCombos(snapshot); // rollback
    }
  };

  const filteredMenuItems = menuItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // Only show the spinner on a genuine cold start (no cached data to paint).
  if (loading && combos.length === 0) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent)] rounded-xl">
            <UtensilsCrossed className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Combo Deals</h2>
            <p className="text-sm text-[var(--text-2)]">Bundle menu items into value deals shown to customers</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Combo
        </button>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[var(--canvas)] border border-[var(--accent-border)] rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-1)]">{editingId ? "Edit Combo" : "New Combo Deal"}</h3>
                <button onClick={resetForm}><X className="w-5 h-5 text-[var(--text-3)] hover:text-[var(--text-2)]" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-2)]">Combo Name *</label>
                  <input type="text" placeholder="e.g. Family Feast" value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-2)]">Short Description</label>
                  <input type="text" placeholder="e.g. Perfect for 2 people" value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-2)]">Original Price (Rs) *</label>
                  <input type="number" placeholder="580" value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-2)]">Combo Price (Rs) *</label>
                  <input type="number" placeholder="450" value={formComboPrice}
                    onChange={(e) => setFormComboPrice(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-2)] flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Photo URL (optional)</label>
                <input type="url" placeholder="https://..." value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>

              {formComboPrice && formOriginalPrice && Number(formOriginalPrice) > Number(formComboPrice) && (
                <div className="flex items-center gap-2 text-sm text-[var(--accent-text)] bg-[var(--accent-muted)] rounded-lg px-3 py-2">
                  <Percent className="w-4 h-4" />
                  Customer saves {savings(Number(formOriginalPrice), Number(formComboPrice))}% — Rs {Number(formOriginalPrice) - Number(formComboPrice)} off
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-[var(--text-2)]">Select Menu Items *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-3)]" />
                  <input type="text" placeholder="Search your menu..." value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>

                {menuItems.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)] text-center py-4">No menu items found. Add items to your menu first.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-[var(--border-soft)] rounded-lg divide-y divide-[var(--border)]">
                    {filteredMenuItems.map((item) => {
                      const selected = formItems.find((i) => i.menuItemId === item.id);
                      return (
                        <div key={item.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--canvas-sub)] transition-colors ${selected ? "bg-[var(--accent)]" : ""}`}
                          onClick={() => toggleMenuItem(item)}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[var(--surface)] flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-3.5 h-3.5 text-[var(--text-3)]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-1)] truncate">{item.name}</p>
                            <p className="text-xs text-[var(--text-3)]">Rs {item.price}</p>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => updateQty(item.id, selected.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-[var(--accent)] rounded text-[var(--accent)] font-bold text-sm hover:bg-[var(--accent)]">-</button>
                              <span className="text-sm font-bold text-[var(--text-1)] w-4 text-center">{selected.quantity}</span>
                              <button onClick={() => updateQty(item.id, selected.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-[var(--accent)] rounded text-[var(--accent)] font-bold text-sm hover:bg-[var(--accent)]">+</button>
                            </div>
                          )}
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? "bg-[var(--accent)] border-[var(--accent-border)]" : "border-[var(--border)]"}`}>
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
                      <span key={i.menuItemId} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--accent)] text-[var(--accent)] rounded-full text-xs font-medium">
                        {i.quantity > 1 && <span className="font-bold">{i.quantity}×</span>}
                        {i.name}
                        <button onClick={() => setFormItems((prev) => prev.filter((p) => p.menuItemId !== i.menuItemId))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)]">Cancel</button>
                <button onClick={handleSubmit} disabled={saving || !formName.trim() || formItems.length === 0 || !formComboPrice || !formOriginalPrice}
                  className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? "Update" : "Create"} Combo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {combos.map((combo) => (
            <motion.div key={combo.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-[var(--canvas)] border rounded-xl shadow-sm transition-opacity ${combo.isActive ? "border-[var(--border-soft)]" : "border-[var(--border)] opacity-60"}`}>
              {combo.imageUrl && (
                <img src={combo.imageUrl} alt={combo.name} className="w-full h-32 object-cover rounded-t-xl" />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-[var(--text-1)]">{combo.name}</h4>
                    {combo.description && <p className="text-xs text-[var(--text-3)] mt-0.5">{combo.description}</p>}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-muted)] text-[var(--accent-text)] rounded-full text-xs font-bold shrink-0">
                    <Tag className="w-3 h-3" />{savings(combo.originalPrice, combo.comboPrice)}% OFF
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {combo.items.map((item, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[var(--accent-muted)] text-[var(--accent-text)] rounded text-xs font-medium">
                      {item.quantity > 1 && <span className="font-bold">{item.quantity}× </span>}{item.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[var(--text-1)]">Rs {combo.comboPrice}</span>
                    <span className="text-sm text-[var(--text-3)] line-through">Rs {combo.originalPrice}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-soft)]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(combo)}>
                      {combo.isActive ? <ToggleRight className="w-7 h-7 text-[var(--accent)]" /> : <ToggleLeft className="w-7 h-7 text-[var(--text-3)]" />}
                    </button>
                    <span className={`text-xs font-medium ${combo.isActive ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                      {combo.isActive ? "Live on menu" : "Hidden"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(combo)} className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent)] rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteCombo(combo.id)} className="p-1.5 text-[var(--text-3)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {combos.length === 0 && !showForm && (
        <div className="text-center py-16 text-[var(--text-3)]">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No combo deals yet</p>
          <p className="text-xs mt-1">Create your first combo to show customers bundled value deals</p>
        </div>
      )}
    </motion.div>
  );
}
