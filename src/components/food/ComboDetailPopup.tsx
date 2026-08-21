"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Tag, Utensils, Check } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import ComboCoverCollage from "./ComboCoverCollage";

export interface ComboDetailPopupProps {
  combo: any;
  restaurantId: string;
  restaurantSlug: string;
  currency: string;
  surgeMultiplier?: number;
  onClose: () => void;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop";

function GrainSVG({ uid }: { uid: string }) {
  const id = `grain-${uid}`;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025] mix-blend-overlay z-[5]"
      aria-hidden="true"
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

export default function ComboDetailPopup({
  combo,
  restaurantId,
  restaurantSlug,
  currency,
  surgeMultiplier = 1,
  onClose,
}: ComboDetailPopupProps) {
  const { addItem } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // Auto-select the first option for single-select groups
    const initialSelections: Record<string, Set<string>> = {};
    if (combo?.choiceGroups) {
      combo.choiceGroups.forEach((group: any) => {
        if (group.maxSelect === 1 && group.options.length > 0) {
          initialSelections[group.id] = new Set([group.options[0].id]);
        } else {
          initialSelections[group.id] = new Set();
        }
      });
    }
    setSelectedOptions(initialSelections);
  }, [combo]);

  if (!combo) return null;

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = new Set(prev[groupId] || []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        if (maxSelect === 1) {
          current.clear();
          current.add(optionId);
        } else {
          if (current.size < maxSelect) {
            current.add(optionId);
          }
        }
      }
      return { ...prev, [groupId]: current };
    });
  };

  // Calculate extra cost from options
  let optionsExtra = 0;
  const selectedOptionNames: string[] = [];
  if (combo.choiceGroups) {
    combo.choiceGroups.forEach((group: any) => {
      const selectedIds = selectedOptions[group.id] || new Set();
      group.options.forEach((opt: any) => {
        if (selectedIds.has(opt.id)) {
          optionsExtra += opt.price || 0;
          selectedOptionNames.push(opt.name);
        }
      });
    });
  }

  const baseDiscounted = combo.comboPrice;
  const finalPricePerUnit = Math.round((baseDiscounted + optionsExtra) * surgeMultiplier);
  const totalDisplayPrice = finalPricePerUnit * quantity;
  
  // Format the name with included items and choices
  const fixedItemNames = combo.items.map((i: any) => (i.quantity > 1 ? `${i.quantity}x ${i.name}` : i.name));
  const allInclusions = [...fixedItemNames, ...selectedOptionNames].join(", ");
  const cartItemName = `${combo.name} (${allInclusions})`;

  const handleAddToCart = () => {
    const cartId = `combo-${combo.id}-${Array.from(Object.values(selectedOptions)).map(s => Array.from(s).join("-")).join("-")}`;
    for (let i = 0; i < quantity; i++) {
      addItem(
        {
          id: cartId,
          name: cartItemName,
          price: finalPricePerUnit,
          image: combo.imageUrl || PLACEHOLDER,
        },
        restaurantId,
        restaurantSlug,
        currency
      );
    }
    onClose();
  };

  const isRequirementMet = () => {
    if (!combo.choiceGroups) return true;
    for (const group of combo.choiceGroups) {
      if (group.maxSelect === 1) {
        if (!selectedOptions[group.id] || selectedOptions[group.id].size === 0) return false;
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-[#fdfcf9] shadow-2xl shadow-black/20"
        style={{ maxHeight: "88vh" }}
      >
        <GrainSVG uid="combo-modal" />
        
        {/* Header / Image area */}
        <div className="relative shrink-0">
          <div className="h-48 w-full bg-[var(--surface)] relative overflow-hidden">
            {combo.imageUrl ? (
              <img
                src={combo.imageUrl}
                alt={combo.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ComboCoverCollage
                images={combo.items.map((item: any) => item.imageUrl || item.menuItem?.imageUrl).filter(Boolean)}
                alt={combo.name}
                fallback={PLACEHOLDER}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white leading-tight mb-1 line-clamp-2">
                  {combo.name}
                </h2>
                {combo.description && (
                  <p className="text-xs font-medium text-white/80 line-clamp-2">
                    {combo.description}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black text-[var(--accent)] drop-shadow-md">
                  {formatPrice(Math.round(combo.comboPrice * surgeMultiplier), currency)}
                </p>
                {combo.originalPrice > combo.comboPrice && (
                  <p className="text-xs font-bold text-white/60 line-through">
                    {formatPrice(Math.round(combo.originalPrice * surgeMultiplier), currency)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-slim relative z-10">
          
          {/* Included Items */}
          <section>
            <h3 className="text-sm font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Utensils className="h-4 w-4 text-[var(--text-3)]" /> Included Items
            </h3>
            <div className="space-y-2">
              {combo.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 border border-[var(--border)]">
                  {item.imageUrl || item.menuItem?.imageUrl ? (
                    <img src={item.imageUrl || item.menuItem?.imageUrl} className="h-10 w-10 rounded-xl object-cover" alt={item.name} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas)]">
                      <Utensils className="h-4 w-4 text-[var(--text-3)]" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-[var(--text-1)]">{item.name}</p>
                    <p className="text-xs font-medium text-[var(--text-3)]">Quantity: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Choice Groups */}
          {combo.choiceGroups?.map((group: any) => (
            <section key={group.id}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-[var(--text-1)]">
                  {group.name}
                </h3>
                <span className="text-xs font-bold text-[var(--text-3)]">
                  {group.maxSelect === 1 ? "Select 1" : `Select up to ${group.maxSelect}`}
                </span>
              </div>
              <div className="space-y-2">
                {group.options.map((opt: any) => {
                  const selected = selectedOptions[group.id]?.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(group.id, opt.id, group.maxSelect)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 transition-colors ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent)]/5"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {opt.imageUrl && (
                          <img src={opt.imageUrl} className="h-10 w-10 rounded-xl object-cover" alt={opt.name} />
                        )}
                        <span className={`text-sm font-bold truncate ${selected ? "text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>
                          {opt.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {opt.price > 0 && (
                          <span className={`text-xs font-bold ${selected ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                            +{formatPrice(Math.round(opt.price * surgeMultiplier), currency)}
                          </span>
                        )}
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-[var(--text-3)]"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Area */}
        <div className="shrink-0 border-t border-[var(--border-soft)] bg-white/95 p-4 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4">
            {/* Quantity */}
            <div className="flex h-12 items-center rounded-2xl bg-[var(--surface)] px-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-2)] hover:bg-[var(--canvas)] hover:text-[var(--text-1)] transition-colors disabled:opacity-50"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-black text-[var(--text-1)]">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-2)] hover:bg-[var(--canvas)] hover:text-[var(--text-1)] transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!isRequirementMet()}
              className="flex h-12 flex-1 items-center justify-between rounded-2xl bg-[var(--accent)] px-5 text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="text-sm font-black tracking-wide">Add Combo</span>
              <span className="text-sm font-black">
                {formatPrice(totalDisplayPrice, currency)}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
