"use client";

import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { bestFoods, type FoodItem } from "@/lib/data";
import { Star, Heart, Clock, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

function AddButton({
  food,
  size = "md",
}: {
  food: FoodItem;
  size?: "sm" | "md";
}) {
  const { addItem, getItemQty } = useCart();
  const { showToast } = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const qty = getItemQty(food.id);

  useGSAP(
    () => {
      if (!btnRef.current) return;
      const el = btnRef.current;
      const enter = () => gsap.to(el, { scale: 1.15, duration: 0.2, ease: "back.out(3)" });
      const leave = () => gsap.to(el, { scale: 1, duration: 0.15, ease: "power2.out" });
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
      return () => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      };
    },
    { scope: btnRef },
  );

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: food.id, name: food.name, price: food.price, image: food.image });
    showToast(`${food.name} added!`);
    if (btnRef.current) {
      gsap.fromTo(btnRef.current, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
    }
  };

  const dims = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleAdd}
        className={`${dims} flex items-center justify-center rounded-full bg-[#FF9933] text-white shadow-md shadow-[#FF9933]/30 transition-colors hover:bg-[#ff8811] active:bg-[#e88520]`}
      >
        <Plus className={iconSize} strokeWidth={3} />
      </button>
      {qty > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0A4D3C] text-[10px] font-bold text-white shadow-sm"
        >
          {qty}
        </motion.span>
      )}
    </div>
  );
}

function MobileCard({
  food,
  onClick,
}: {
  food: FoodItem;
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className="flex gap-4 py-4 border-b border-gray-100 last:border-b-0 cursor-pointer group"
    >
      <div className="relative h-[120px] w-[120px] shrink-0 rounded-2xl overflow-hidden">
        <img
          src={food.image}
          alt={food.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {food.discount && (
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
            <span className="text-[10px] font-extrabold text-white uppercase leading-tight tracking-wide">
              {food.discount}
            </span>
          </div>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-gray-400 backdrop-blur-sm transition-all hover:bg-white hover:text-red-500 active:scale-90"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5">
        <h3 className="text-[15px] font-bold text-[#1F2A2A] leading-tight truncate">
          {food.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <Star className="h-3 w-3 fill-[#0A4D3C] text-[#0A4D3C]" />
          <span className="text-xs font-bold text-[#1F2A2A]">{food.rating}</span>
          <span className="text-gray-300">&middot;</span>
          <span className="text-[13px] text-gray-500">{food.time}</span>
        </div>
        <p className="text-[13px] text-gray-500 mt-0.5 truncate">
          {food.restaurant}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[14px] font-bold text-[#FF9933]">
            {food.priceLabel}
          </p>
          <AddButton food={food} size="sm" />
        </div>
      </div>
    </motion.div>
  );
}

function DesktopCard({
  food,
  onClick,
}: {
  food: FoodItem;
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        <img
          src={food.image}
          alt={food.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 text-gray-400 backdrop-blur-sm transition-all hover:bg-white hover:text-red-500 hover:scale-110 active:scale-95 shadow-sm"
        >
          <Heart className="h-4 w-4" />
        </button>

        {food.discount && (
          <div className="absolute top-2.5 left-2.5 bg-[#FF9933] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide shadow-sm">
            {food.discount}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
          <span className="text-white text-lg font-extrabold drop-shadow-md">
            {food.priceLabel}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <AddButton food={food} />
          </div>
        </div>
      </div>

      <div className="pt-2.5">
        <h3 className="text-[15px] font-bold text-[#1F2A2A] leading-tight truncate group-hover:text-[#FF9933] transition-colors">
          {food.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-3 w-3 fill-[#0A4D3C] text-[#0A4D3C]" />
          <span className="text-xs font-bold text-[#1F2A2A]">{food.rating}</span>
          <span className="text-gray-300 mx-0.5">&middot;</span>
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-500">{food.time}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{food.restaurant}</p>
      </div>
    </motion.div>
  );
}

export default function TopPlaces({
  onFoodClick,
}: {
  onFoodClick: (food: FoodItem) => void;
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10 py-6 md:py-10">
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl font-bold tracking-tight text-[#1F2A2A] md:text-2xl">
            Best foods around you
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="flex flex-col md:hidden"
        >
          {bestFoods.map((food) => (
            <MobileCard
              key={food.id}
              food={food}
              onClick={() => onFoodClick(food)}
            />
          ))}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-x-7 gap-y-8"
        >
          {bestFoods.map((food) => (
            <DesktopCard
              key={food.id}
              food={food}
              onClick={() => onFoodClick(food)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
