"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
}

interface Props {
  categories: Category[];
  activeId: string | "ALL";
  onSelect: (id: string | "ALL") => void;
}

export default function KioskCategoryBar({ categories, activeId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topCats = categories.filter((c) => c.parentId === null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => scroll("left")}
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-gray-500" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1 py-1"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect("ALL")}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeId === "ALL"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
              : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:bg-amber-50"
          }`}
        >
          All Items
        </motion.button>

        {topCats.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeId === cat.id
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:bg-amber-50"
            }`}
          >
            {cat.name}
          </motion.button>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
}
