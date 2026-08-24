"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Plus, X, Tag, Trash2, Pencil,
  Check, Loader2, ImageIcon, ToggleLeft, ToggleRight,
  Package, Layers, Sparkles
} from "lucide-react";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import ImagePicker from "@/components/shared/ImagePicker";
import { FOOD_DESCRIPTION_TEMPLATES } from "@/lib/food-descriptions";
import DishImageSuggestions from "@/components/dashboard/DishImageSuggestions";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface MenuItem {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

interface ComboItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string | null;
  menuItemId?: string | null;
}

interface ComboChoiceOption {
  id?: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

interface ComboChoiceGroup {
  id?: string;
  name: string;
  maxSelect: number;
  options: ComboChoiceOption[];
}

interface ComboMeal {
  id: string;
  name: string;
  description: string | null;
  comboPrice: number;
  originalPrice: number;
  isActive: boolean;
  items: (ComboItem & { id: string; menuItem: MenuItem | null })[];
  choiceGroups: (ComboChoiceGroup & { id: string })[];
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

/* ─── Premium Components ────────────────────────────────────────────── */

function AnimatedAddButton({ onClick, label, icon: Icon = Plus }: { onClick: () => void, label: string, icon?: any }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)]/50 py-4 text-[13px] font-bold text-[var(--text-3)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]"
    >
      <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
      {label}
    </button>
  );
}

/* ─── Form Builder ────────────────────────────────────────────────────── */

function ComboForm({
  editingCombo,
  onSave,
  onCancel,
}: {
  editingCombo: ComboMeal | null;
  onSave: (payload: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editingCombo?.name ?? "");
  const [desc, setDesc] = useState(editingCombo?.description ?? "");
  const [comboPrice, setComboPrice] = useState(editingCombo ? String(editingCombo.comboPrice) : "");
  const [originalPrice, setOriginalPrice] = useState(editingCombo ? String(editingCombo.originalPrice) : "");

  const [items, setItems] = useState<SelectedItem[]>(
    editingCombo?.items.map((i) => ({
      id: i.id ?? `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: i.name,
      price: i.price,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
    })) ?? []
  );

  const [choiceGroups, setChoiceGroups] = useState<(ComboChoiceGroup & { id: string })[]>(
    editingCombo?.choiceGroups?.map(cg => ({
      ...cg,
      id: cg.id ?? `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      options: cg.options?.map(opt => ({ ...opt, id: opt.id ?? `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })) ?? [],
    })) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [activeImageTarget, setActiveImageTarget] = useState<{ type: 'item', id: string } | { type: 'option', groupId: string, optionId: string } | null>(null);

  const savingsPct =
    Number(originalPrice) > Number(comboPrice) && Number(originalPrice) > 0
      ? Math.round(((Number(originalPrice) - Number(comboPrice)) / Number(originalPrice)) * 100)
      : 0;

  const canSave = name.trim() && comboPrice && originalPrice && (items.length > 0 || choiceGroups.length > 0);

  const generateDescription = () => {
    let randomTemplate = FOOD_DESCRIPTION_TEMPLATES[Math.floor(Math.random() * FOOD_DESCRIPTION_TEMPLATES.length)];
    randomTemplate = randomTemplate.replace(/\[Name\]/g, name || "combo deal");
    
    let spiceStr = "delicious";
    randomTemplate = randomTemplate.replace(/\[Spice\]/g, spiceStr);
    
    const flavors = ["savory", "tangy", "rich", "mouth-watering", "delicious", "sweet and savory"];
    randomTemplate = randomTemplate.replace(/\[Flavor\]/g, flavors[Math.floor(Math.random() * flavors.length)]);
    
    setDesc(randomTemplate);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      description: desc.trim() || null,
      comboPrice: Number(comboPrice),
      originalPrice: Number(originalPrice),
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, imageUrl: i.imageUrl })),
      choiceGroups: choiceGroups.map((cg) => ({
        name: cg.name,
        maxSelect: cg.maxSelect,
        options: cg.options.map(opt => ({ name: opt.name, price: opt.price, imageUrl: opt.imageUrl })),
      })),
    });
    setSaving(false);
  };

  const handleImageSelect = (url: string) => {
    if (!activeImageTarget) return;
    if (activeImageTarget.type === 'item') {
      setItems(prev => prev.map(item => item.id === activeImageTarget.id ? { ...item, imageUrl: url } : item));
    } else if (activeImageTarget.type === 'option') {
      setChoiceGroups(prev => prev.map(cg => 
        cg.id === activeImageTarget.groupId 
          ? { ...cg, options: cg.options.map(opt => opt.id === activeImageTarget.optionId ? { ...opt, imageUrl: url } : opt) } 
          : cg
      ));
    }
    setActiveImageTarget(null);
  };

  return (
    <>
      <ImagePicker
        open={!!activeImageTarget}
        currentImage={null}
        onSelect={handleImageSelect}
        onClose={() => setActiveImageTarget(null)}
        type="food"
        initialQuery={name}
      />

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 20 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="relative z-10 mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--canvas)] shadow-2xl"
      >
        {/* Top Header */}
        <div className="relative flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] shadow-inner">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-black tracking-tight text-[var(--text-1)]">
                {editingCombo ? "Edit Combo Deal" : "Design New Combo"}
              </h2>
              <p className="text-[13px] font-medium text-[var(--text-3)]">Bundle items to create massive value for customers</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas-sub)] text-[var(--text-2)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-1)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Builder Area (Left) */}
          <div className="flex-1 overflow-y-auto p-8 lg:max-h-[75vh] scrollbar-slim">
            <div className="mx-auto max-w-2xl space-y-10">
              
              {/* Core Details */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--text-1)] text-[12px] font-bold text-[var(--canvas)]">1</div>
                  <h3 className="text-[15px] font-bold text-[var(--text-1)]">Core Details</h3>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[13px] font-bold text-[var(--text-2)]">Combo Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., The Ultimate Family Feast"
                      className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] font-bold text-[var(--text-1)] transition-colors focus:border-[var(--accent)] focus:bg-[var(--canvas)] focus:outline-none"
                    />
                  </div>
                  
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[var(--text-2)]">Description</label>
                      <button
                        type="button"
                        onClick={generateDescription}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                      >
                        <Sparkles className="h-3 w-3" /> Auto Generate
                      </button>
                    </div>
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="Describe what makes this combo special..."
                      rows={2}
                      className="w-full resize-none rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[14px] font-medium text-[var(--text-1)] transition-colors focus:border-[var(--accent)] focus:bg-[var(--canvas)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-[var(--text-2)]">Actual Value (Rs)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="1000"
                        className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] font-bold text-[var(--text-1)] transition-colors focus:border-[var(--accent)] focus:bg-[var(--canvas)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-[var(--accent)]">Offer Price (Rs)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={comboPrice}
                        onChange={(e) => setComboPrice(e.target.value)}
                        placeholder="799"
                        className="w-full rounded-2xl border-2 border-[var(--accent-muted)] bg-[var(--accent)]/5 px-4 py-3.5 text-[15px] font-black text-[var(--accent)] transition-colors focus:border-[var(--accent)] focus:bg-[var(--accent)]/10 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Fixed Items */}
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--text-1)] text-[12px] font-bold text-[var(--canvas)]">2</div>
                    <h3 className="text-[15px] font-bold text-[var(--text-1)]">Included Items</h3>
                  </div>
                  <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-2)]">{items.length} items</span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        key={item.id}
                        className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3 transition-colors hover:border-[var(--border-hover)]"
                      >
                        <button
                          onClick={() => setActiveImageTarget({ type: 'item', id: item.id })}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[var(--text-3)]" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                            <Pencil className="h-4 w-4 text-white" />
                          </div>
                        </button>
                        
                        <div className="flex-1 space-y-2">
                          <input
                            value={item.name}
                            onChange={(e) => setItems(prev => prev.map(x => x.id === item.id ? { ...x, name: e.target.value } : x))}
                            placeholder="Item name (e.g. Large Fries)"
                            className="w-full bg-transparent text-[14px] font-bold text-[var(--text-1)] placeholder:font-medium placeholder:text-[var(--text-3)] focus:outline-none mb-1"
                          />
                          <DishImageSuggestions
                            name={item.name}
                            imageUrl={item.imageUrl}
                            onPick={(url) => setItems(prev => prev.map(x => x.id === item.id ? { ...x, imageUrl: url } : x))}
                            onMore={() => setActiveImageTarget({ type: 'item', id: item.id })}
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-2.5 py-1">
                              <span className="text-[11px] font-bold text-[var(--text-3)]">Rs</span>
                              <input
                                type="number"
                                value={item.price || ""}
                                onChange={(e) => setItems(prev => prev.map(x => x.id === item.id ? { ...x, price: Number(e.target.value) } : x))}
                                placeholder="0"
                                className="w-16 bg-transparent text-[12px] font-bold text-[var(--text-1)] focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center rounded-lg bg-[var(--surface)]">
                              <button onClick={() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))} className="px-3 py-1.5 text-[var(--text-2)] hover:text-[var(--text-1)] font-bold text-[13px]">-</button>
                              <span className="w-6 text-center text-[12px] font-bold text-[var(--text-1)]">{item.quantity}</span>
                              <button onClick={() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))} className="px-3 py-1.5 text-[var(--text-2)] hover:text-[var(--text-1)] font-bold text-[13px]">+</button>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))}
                          className="shrink-0 rounded-xl p-2 text-[var(--text-3)] transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <AnimatedAddButton onClick={() => setItems([...items, { id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: "", price: 0, imageUrl: null, quantity: 1 }])} label="Add Fixed Item" />
                </div>
              </section>

              {/* Choice Groups */}
              <section className="space-y-5 pb-8">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--text-1)] text-[12px] font-bold text-[var(--canvas)]">3</div>
                    <h3 className="text-[15px] font-bold text-[var(--text-1)]">Choice Options</h3>
                  </div>
                </div>

                <div className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {choiceGroups.map((group) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        key={group.id}
                        className="overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--canvas)] shadow-sm"
                      >
                        {/* Group Header */}
                        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] shadow-sm">
                            <Layers className="h-5 w-5 text-[var(--accent)]" />
                          </div>
                          <input
                            value={group.name}
                            onChange={(e) => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))}
                            placeholder="e.g. Choose your Beverage"
                            className="flex-1 bg-transparent text-[15px] font-bold text-[var(--text-1)] placeholder:font-medium placeholder:text-[var(--text-3)] focus:outline-none min-w-[150px]"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 rounded-xl bg-[var(--canvas)] px-3 py-2 shadow-sm border border-[var(--border)]">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">Select</span>
                              <select
                                value={group.maxSelect}
                                onChange={(e) => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, maxSelect: Number(e.target.value) } : g))}
                                className="bg-transparent text-[13px] font-black text-[var(--text-1)] focus:outline-none cursor-pointer"
                              >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </label>
                            <button
                              onClick={() => setChoiceGroups(prev => prev.filter(g => g.id !== group.id))}
                              className="rounded-xl p-2.5 text-[var(--text-3)] hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="bg-[var(--canvas-sub)] p-4 space-y-3">
                          <AnimatePresence mode="popLayout">
                            {group.options.map((opt) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                key={opt.id}
                                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-2 shadow-sm transition-colors hover:border-[var(--border-hover)]"
                              >
                                <button
                                  onClick={() => setActiveImageTarget({ type: 'option', groupId: group.id, optionId: opt.id! })}
                                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]"
                                >
                                  {opt.imageUrl ? (
                                    <img src={opt.imageUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-[var(--text-3)] opacity-50" />
                                    </div>
                                  )}
                                </button>
                                
                                <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
                                  <div className="flex-1 min-w-[120px]">
                                    <input
                                      value={opt.name}
                                      onChange={(e) => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, options: g.options.map(o => o.id === opt.id ? { ...o, name: e.target.value } : o) } : g))}
                                      placeholder="Option Name (e.g. Sprite)"
                                      className="w-full bg-transparent text-[13px] font-bold text-[var(--text-1)] placeholder:font-medium placeholder:text-[var(--text-3)] focus:outline-none mb-1"
                                    />
                                    <DishImageSuggestions
                                      name={opt.name}
                                      imageUrl={opt.imageUrl}
                                      onPick={(url) => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, options: g.options.map(o => o.id === opt.id ? { ...o, imageUrl: url } : o) } : g))}
                                      onMore={() => setActiveImageTarget({ type: 'option', groupId: group.id, optionId: opt.id! })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 shrink-0 self-start mt-0.5">
                                    <span className="text-[10px] font-bold text-[var(--text-3)]">+Rs</span>
                                    <input
                                      type="number"
                                      value={opt.price || ""}
                                      onChange={(e) => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, options: g.options.map(o => o.id === opt.id ? { ...o, price: Number(e.target.value) } : o) } : g))}
                                      placeholder="0"
                                      className="w-12 bg-transparent text-[12px] font-black text-[var(--accent)] focus:outline-none"
                                    />
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, options: g.options.filter(o => o.id !== opt.id) } : g))}
                                  className="shrink-0 rounded-lg p-2 text-[var(--text-3)] hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <button
                            onClick={() => setChoiceGroups(prev => prev.map(g => g.id === group.id ? { ...g, options: [...g.options, { id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: "", price: 0, imageUrl: null }] } : g))}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
                          >
                            <Plus className="h-4 w-4" /> Add Option
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  <AnimatedAddButton onClick={() => setChoiceGroups([...choiceGroups, { id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: "", maxSelect: 1, options: [] }])} label="Add Choice Group" icon={Layers} />
                </div>
              </section>

            </div>
          </div>

          {/* Premium Preview (Right) */}
          <div className="hidden lg:flex w-[420px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] relative overflow-hidden">
            {/* Background glowing effect */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.05] blur-3xl" />
            
            <div className="flex-1 p-8 flex flex-col items-center">
              <div className="w-full max-w-[340px]">
                <div className="mb-6 flex items-center justify-between">
                  <h4 className="text-[13px] font-black tracking-widest text-[var(--text-3)] uppercase">Live Preview</h4>
                  <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-600">UPDATING</span>
                  </div>
                </div>

                {/* The "Card" Mockup */}
                <motion.div layout className="relative overflow-hidden rounded-[1.5rem] bg-[var(--canvas)] shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                  {/* Dynamic Header Image area */}
                  <div className="relative h-40 w-full bg-[var(--surface)] overflow-hidden flex">
                    {items.filter(i => i.imageUrl).slice(0,2).map((item, i, arr) => (
                       <img key={i} src={item.imageUrl!} className="flex-1 h-full object-cover border-r border-[var(--border)] last:border-0" alt="" />
                    ))}
                    {items.filter(i => i.imageUrl).length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--canvas-sub)] to-[var(--surface)]">
                         <UtensilsCrossed className="h-8 w-8 text-[var(--text-3)] opacity-20 mb-2" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">No Images Yet</span>
                      </div>
                    )}
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                       {savingsPct > 0 && (
                         <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                           SAVE {savingsPct}%
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-[18px] font-black leading-tight text-[var(--text-1)] mb-1">
                      {name || "Awesome Combo Name"}
                    </h3>
                    <p className="text-[13px] font-medium text-[var(--text-3)] leading-relaxed line-clamp-2 mb-4">
                      {desc || "A delicious description of this amazing bundle."}
                    </p>

                    <div className="flex items-baseline gap-2 pb-5 border-b border-dashed border-[var(--border)]">
                      <span className="text-[24px] font-black tracking-tight text-[var(--accent)]">
                        Rs {comboPrice || "0"}
                      </span>
                      {originalPrice && Number(originalPrice) > Number(comboPrice) && (
                        <span className="text-[14px] font-semibold text-[var(--text-3)] line-through">
                          Rs {originalPrice}
                        </span>
                      )}
                    </div>

                    <div className="pt-4 space-y-4">
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-1)]">Includes</p>
                          {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/10 text-[11px] font-black text-[var(--accent)]">
                                {item.quantity}x
                              </div>
                              <span className="text-[13px] font-semibold text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                                {item.name || "Item Name"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {choiceGroups.length > 0 && (
                        <div className="space-y-3 pt-2">
                          {choiceGroups.map(group => (
                            <div key={group.id} className="space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-1)]">
                                {group.name || "Choice"}
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {group.options.map((opt, i) => (
                                  <div key={opt.id} className="flex items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      {opt.imageUrl ? 
                                        <img src={opt.imageUrl} className="h-5 w-5 rounded object-cover" /> :
                                        <div className="h-3 w-3 rounded-full border-2 border-[var(--border)]" />
                                      }
                                      <span className="text-[12px] font-semibold text-[var(--text-2)]">{opt.name || `Option ${i+1}`}</span>
                                    </div>
                                    {opt.price > 0 && <span className="text-[11px] font-bold text-[var(--text-3)]">+ Rs {opt.price}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
                
                {/* Cost Breakdown */}
                {items.length > 0 && (
                  <div className="w-full mt-6 rounded-xl border border-dashed border-[var(--border)] bg-transparent p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">Value Calculation</p>
                    <div className="space-y-1.5 mb-3">
                      {items.map(item => (
                        <div key={`calc-${item.id}`} className="flex justify-between text-[12px]">
                          <span className="text-[var(--text-2)]">{item.quantity}x {item.name || "Item"}</span>
                          <span className="font-medium text-[var(--text-1)]">Rs {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-[var(--border-soft)] pt-2 text-[13px]">
                      <span className="font-bold text-[var(--text-2)]">Total Value</span>
                      <span className="font-black text-[var(--text-1)]">
                        Rs {items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions Pinned Bottom */}
            <div className="border-t border-[var(--border)] bg-[var(--canvas)] p-5 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-[15px] font-black text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--accent)]/40 disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5 transition-transform group-hover:scale-110" />
                    {editingCombo ? "Save Combo Details" : "Publish Combo Offer"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="fixed inset-0 z-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    </>
  );
}

/* ─── Main Tab ────────────────────────────────────────────────────────── */

export default function ComboMealsTab({ restaurantId }: { restaurantId?: string }) {
  const combosPath = restaurantId ? `/api/restaurants/${restaurantId}/combo-meals` : "";
  const [combos, setCombos] = useState<ComboMeal[]>(
    () => peekApiCache<ComboMeal[]>(combosPath) ?? []
  );
  const [loading, setLoading] = useState(() => !peekApiCache(combosPath));
  const [showForm, setShowForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboMeal | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch<ComboMeal[]>(`/api/restaurants/${restaurantId}/combo-meals`);
      setCombos(data);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) load();
  }, [load, restaurantId]);

  const savings = (o: number, c: number) => o > c ? Math.round(((o - c) / o) * 100) : 0;

  const openCreate = () => { setEditingCombo(null); setShowForm(true); };
  const openEdit = (combo: ComboMeal) => { setEditingCombo(combo); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingCombo(null); };

  const handleSave = async (payload: {
    name: string; description: string | null;
    comboPrice: number; originalPrice: number;
    items: { name: string; quantity: number; price: number; imageUrl: string | null }[];
    choiceGroups: { name: string; maxSelect: number; options: { name: string; price: number; imageUrl: string | null }[] }[];
  }) => {
    const editing = editingCombo;
    const snapshot = combos;
    const tempId = `temp-${Date.now()}`;
    
    const optimisticPayload = {
      ...payload,
      id: editing?.id ?? tempId,
      isActive: editing?.isActive ?? true,
      items: payload.items.map((fi, i) => ({
        id: `tmp-item-${i}`, ...fi, menuItemId: null, menuItem: null,
      })),
      choiceGroups: payload.choiceGroups.map((cg, i) => ({
        ...cg,
        id: `tmp-cg-${i}`,
        options: cg.options.map((opt, j) => ({ ...opt, id: `tmp-opt-${j}` }))
      }))
    } as ComboMeal;

    if (editing) {
      setCombos((prev) => prev.map((c) => c.id === editing.id ? optimisticPayload : c));
    } else {
      setCombos((prev) => [optimisticPayload, ...prev]);
    }
    
    closeForm();
    try {
      if (editing) {
        const updated = await apiFetch<ComboMeal>(
          `/api/restaurants/${restaurantId}/combo-meals/${editing.id}`,
          { method: "PATCH", body: payload }
        );
        setCombos((prev) => prev.map((c) => c.id === editing.id ? updated : c));
      } else {
        const created = await apiFetch<ComboMeal>(
          `/api/restaurants/${restaurantId}/combo-meals`,
          { method: "POST", body: payload }
        );
        setCombos((prev) => prev.map((c) => c.id === tempId ? created : c));
      }
    } catch {
      setCombos(snapshot);
    }
  };

  const toggleActive = async (combo: ComboMeal) => {
    const snapshot = combos;
    setCombos((prev) => prev.map((c) => c.id === combo.id ? { ...c, isActive: !c.isActive } : c));
    try {
      const updated = await apiFetch<ComboMeal>(
        `/api/restaurants/${restaurantId}/combo-meals/${combo.id}`,
        { method: "PATCH", body: { isActive: !combo.isActive } }
      );
      setCombos((prev) => prev.map((c) => c.id === combo.id ? updated : c));
    } catch { setCombos(snapshot); }
  };

  const deleteCombo = async (id: string) => {
    if (!confirm("Delete this combo deal?")) return;
    const snapshot = combos;
    setCombos((prev) => prev.filter((c) => c.id !== id));
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/combo-meals/${id}`, { method: "DELETE" });
    } catch { setCombos(snapshot); }
  };

  if (loading && combos.length === 0) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
    </div>
  );

  return (
    <div className="relative space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10">
              <Package className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-[var(--text-1)]">Combo Offers</h1>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-3)] max-w-xl">
            Design irresistible value meals by grouping your best-sellers and letting customers choose their favorites.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="group flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-[14px] font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--accent)]/40 hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5" /> 
            <span>Create Combo</span>
          </button>
        )}
      </div>

      {/* Form Overlay */}
      <AnimatePresence>
        {showForm && restaurantId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <ComboForm
              key={editingCombo?.id ?? "new"}
              editingCombo={editingCombo}
              onSave={handleSave}
              onCancel={closeForm}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {combos.map((combo) => (
            <motion.div
              key={combo.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`group flex flex-col rounded-[24px] border-2 bg-[var(--canvas)] overflow-hidden transition-all hover:shadow-xl ${
                combo.isActive ? "border-[var(--border)] hover:border-[var(--accent)]/50" : "border-[var(--border)] opacity-60 grayscale-[0.5]"
              }`}
            >
              {/* Card Header Gallery */}
              <div className="relative flex h-40 w-full overflow-hidden bg-[var(--surface)]">
                {combo.items.filter(i => i.imageUrl).slice(0, 3).map((item, idx, arr) => (
                  <div key={idx} className={`relative flex-1 h-full border-r border-[var(--border)] last:border-r-0`}>
                    <img src={item.imageUrl!} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                ))}
                {combo.items.filter(i => i.imageUrl).length === 0 && (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--canvas-sub)] to-[var(--surface)]">
                     <UtensilsCrossed className="h-8 w-8 text-[var(--text-3)] opacity-20" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Title inside image */}
                <div className="absolute bottom-4 left-5 right-5">
                  <h3 className="text-[18px] font-black leading-tight text-white drop-shadow-md">{combo.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[16px] font-black text-[var(--accent)] drop-shadow-md">Rs {combo.comboPrice}</span>
                    {savings(combo.originalPrice, combo.comboPrice) > 0 && (
                      <span className="text-[12px] font-bold text-white/70 line-through">Rs {combo.originalPrice}</span>
                    )}
                  </div>
                </div>

                {/* Savings Badge */}
                {savings(combo.originalPrice, combo.comboPrice) > 0 && (
                  <div className="absolute right-4 top-4 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-black/20">
                    SAVE {savings(combo.originalPrice, combo.comboPrice)}%
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 p-5">
                {combo.description && (
                  <p className="mb-4 text-[13px] font-medium text-[var(--text-3)] line-clamp-2">{combo.description}</p>
                )}

                {/* Badges for contents */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {combo.items.map((item, idx) => (
                    <span key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--canvas-sub)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-2)] shadow-sm">
                      <span className="text-[var(--text-1)]">{item.quantity}x</span> {item.name}
                    </span>
                  ))}
                  {combo.choiceGroups?.map((cg, idx) => (
                    <span key={`cg-${idx}`} className="flex items-center gap-1 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-2.5 py-1 text-[11px] font-bold text-[var(--accent)] shadow-sm">
                      <Layers className="h-3 w-3" /> {cg.name}
                    </span>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <button 
                    onClick={() => toggleActive(combo)} 
                    className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-[var(--surface)]"
                  >
                    {combo.isActive
                      ? <ToggleRight className="h-6 w-6 text-[var(--accent)]" />
                      : <ToggleLeft className="h-6 w-6 text-[var(--text-3)]" />}
                    <span className={`text-[12px] font-bold ${combo.isActive ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>
                      {combo.isActive ? "Active" : "Hidden"}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEdit(combo)} 
                      className="rounded-xl bg-[var(--canvas-sub)] p-2 text-[var(--text-2)] transition-all hover:bg-[var(--accent)] hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteCombo(combo.id)} 
                      className="rounded-xl bg-[var(--canvas-sub)] p-2 text-[var(--text-2)] transition-all hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {combos.length === 0 && !showForm && (
        <div className="mx-auto max-w-md flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[var(--surface)] shadow-inner">
            <Package className="h-10 w-10 text-[var(--text-3)] opacity-40" />
          </div>
          <h2 className="text-[20px] font-black text-[var(--text-1)] mb-2">No Combo Deals Yet</h2>
          <p className="text-[14px] font-medium text-[var(--text-3)] mb-8">
            Create your first combo to show customers bundled value deals and increase your average order value!
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-2xl bg-[var(--text-1)] px-6 py-3 text-[14px] font-bold text-[var(--canvas)] transition-transform hover:-translate-y-1 hover:shadow-xl"
          >
            <Plus className="h-5 w-5" /> Create Combo
          </button>
        </div>
      )}
    </div>
  );
}
