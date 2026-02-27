"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { categories } from "@/lib/data";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function FoodCategories() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Hover animation for category items is handled via CSS or interaction
      const items = gsap.utils.toArray<HTMLElement>(".category-item");

      items.forEach((item) => {
        item.addEventListener("mouseenter", () => {
          gsap.to(item, {
            y: -8,
            scale: 1.05,
            duration: 0.3,
            ease: "back.out(1.5)",
          });
        });
        item.addEventListener("mouseleave", () => {
          gsap.to(item, { y: 0, scale: 1, duration: 0.3, ease: "power2.out" });
        });
      });
    },
    { scope: containerRef },
  );

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <section
      ref={containerRef}
      className="container mx-auto px-4 md:px-6 py-12 md:py-16"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-[#1F2A2A] md:text-3xl">
          What's on your mind?
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={scrollLeft}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[#1F2A2A] transition-colors hover:bg-gray-200 active:bg-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollRight}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[#1F2A2A] transition-colors hover:bg-gray-200 active:bg-gray-300"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="category-item flex flex-col items-center gap-3 shrink-0 snap-start cursor-pointer group"
          >
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-white shadow-md transition-shadow group-hover:shadow-xl border border-gray-100">
              <span className="text-4xl sm:text-5xl drop-shadow-sm">
                {cat.image}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 sm:text-base group-hover:text-[#FF9933] transition-colors">
              {cat.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
