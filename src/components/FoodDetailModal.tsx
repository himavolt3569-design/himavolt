"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Plus, Minus, Clock, MapPin } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { FoodItem } from "@/lib/data";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 280 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

export default function FoodDetailModal({
  food,
  open,
  onClose,
}: {
  food: FoodItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<number>>(new Set());
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (open && imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { scale: 1.08 },
          { scale: 1, duration: 0.8, ease: "power2.out" },
        );
      }
    },
    { dependencies: [open] },
  );

  if (!food) return null;

  const toggleAddOn = (id: number) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addOnTotal = food.addOns
    .filter((a) => selectedAddOns.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const itemTotal = (food.price + addOnTotal) * qty;
  const existingQty = getItemQty(food.id);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: food.id,
        name: food.name,
        price: food.price + addOnTotal,
        image: food.image,
      });
    }
    showToast(`${food.name} added to cart!`);
    setQty(1);
    setSelectedAddOns(new Set());
    onClose();
  };

  const handleSubmitRating = () => {
    if (userRating === 0) return;
    console.log("Rating submitted:", { food: food.name, rating: userRating, comment });
    setRatingSubmitted(true);
    showToast("Thanks for your rating!");
    setTimeout(() => setRatingSubmitted(false), 3000);
  };

  const handleClose = () => {
    setQty(1);
    setSelectedAddOns(new Set());
    setUserRating(0);
    setComment("");
    setRatingSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]"
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 bottom-0 top-0 md:top-[5vh] md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:bottom-auto md:max-h-[90vh] z-[105] bg-white md:rounded-t-3xl md:rounded-b-3xl overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div ref={imageRef} className="relative w-full aspect-[4/3] overflow-hidden">
                <img
                  src={food.image}
                  alt={food.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 rounded-full p-2 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
                {food.discount && (
                  <div className="absolute top-4 left-4 bg-[#FF9933] text-white text-xs font-extrabold px-3 py-1 rounded-lg shadow-md">
                    {food.discount}
                  </div>
                )}
                {existingQty > 0 && (
                  <div className="absolute bottom-4 right-4 bg-[#0A4D3C] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
                    {existingQty} in cart
                  </div>
                )}
              </div>

              <div className="px-5 pt-5 pb-3">
                <h2 className="text-2xl font-bold text-[#1F2A2A] tracking-tight">
                  {food.name}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#FF9933] text-[#FF9933]" />
                    <span className="font-bold text-[#1F2A2A]">{food.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{food.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{food.restaurant}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  {food.description}
                </p>
                <p className="text-xl font-extrabold text-[#FF9933] mt-3">
                  {food.priceLabel}
                </p>
              </div>

              {food.addOns.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-[#1F2A2A] uppercase tracking-wider mb-3">
                    Extra Something?
                  </h3>
                  <div className="flex flex-col gap-2">
                    {food.addOns.map((addon) => (
                      <label
                        key={addon.id}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border transition-all ${
                          selectedAddOns.has(addon.id)
                            ? "border-[#FF9933] bg-[#FF9933]/5"
                            : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAddOns.has(addon.id)}
                          onChange={() => toggleAddOn(addon.id)}
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                            selectedAddOns.has(addon.id)
                              ? "bg-[#FF9933] border-[#FF9933]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedAddOns.has(addon.id) && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium text-[#1F2A2A]">
                          {addon.name}
                        </span>
                        <span className="text-sm font-bold text-gray-500">
                          {addon.price > 0 ? `+Rs. ${addon.price}` : "Free"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-5 py-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-[#1F2A2A] uppercase tracking-wider mb-3">
                  Rate this dish
                </h3>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (hoverRating || userRating)
                            ? "fill-[#FF9933] text-[#FF9933]"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-500">
                      {userRating}/5
                    </span>
                  )}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this dish..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:border-[#FF9933] focus:ring-1 focus:ring-[#FF9933]/30 focus:bg-white transition-all resize-none"
                />
                <button
                  onClick={handleSubmitRating}
                  disabled={userRating === 0 || ratingSubmitted}
                  className="mt-2 rounded-lg bg-[#0A4D3C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#083a2d] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {ratingSubmitted ? "Submitted!" : "Submit Rating"}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 bg-white flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-1">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-[#1F2A2A] transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-base font-bold text-[#1F2A2A]">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-[#1F2A2A] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 rounded-xl bg-[#FF9933] py-3.5 text-base font-bold text-white transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-lg shadow-[#FF9933]/25"
              >
                Add to Cart — Rs. {itemTotal}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
