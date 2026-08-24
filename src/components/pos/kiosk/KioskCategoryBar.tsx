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
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas)] border border-[var(--border)] shadow-sm hover:bg-[var(--canvas-sub)] transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-[var(--text-2)]" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1 py-1"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("ALL")}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeId === "ALL"
              ? "bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/20/25"
              : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)]"
          }`}
        >
          All Items
        </motion.button>

        {topCats.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              activeId === cat.id
                ? "bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/20/25"
                : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)]"
            }`}
          >
            {cat.name}
          </motion.button>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas)] border border-[var(--border)] shadow-sm hover:bg-[var(--canvas-sub)] transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-[var(--text-2)]" />
      </button>
    </div>
  );
}
