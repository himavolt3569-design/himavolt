"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  Star,
  Clock,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Leaf,
  Sparkles,
  TrendingUp,
  Award,
  Utensils,
  Loader2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Types ────────────────────────────────────────────────────────── */

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  rating: number;
  prepTime: string;
  isVeg: boolean;
  tags: string[];
  discount: number;
  discountLabel: string | null;
  isFeatured: boolean;
  badge: string | null;
  restaurantId: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    address: string;
    imageUrl: string | null;
  };
  category: { name: string; slug: string };
  sizes: { id: string; label: string; grams: string; priceAdd: number }[];
  addOns: { id: string; name: string; price: number }[];
}

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop";

function img(url: string | null) {
  return url || PLACEHOLDER_IMG;
}

/* ── Suggestion Card ──────────────────────────────────────────────── */

function SuggestionCard({
  item,
  index,
}: {
  item: MenuItemData;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, x: 60, scale: 0.9 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.5,
          delay: index * 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <Link href={`/food/${item.id}`}>
      <div
        ref={ref}
        className="group shrink-0 w-[160px] sm:w-[200px] cursor-pointer"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm group-hover:shadow-xl transition-shadow duration-300">
          <img
            src={img(item.imageUrl)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          {item.discountLabel && (
            <div className="absolute bottom-2 left-2">
              <span className="inline-block rounded-md bg-[#E23744] px-1.5 py-0.5 text-[10px] font-extrabold text-white leading-none shadow-sm">
                {item.discountLabel}
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2">
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold text-white leading-none ${
                item.rating >= 4 ? "bg-[#1E7B3E]" : "bg-[#DB7C10]"
              }`}
            >
              {item.rating.toFixed(1)}
              <Star className="h-2 w-2 fill-white" />
            </span>
          </div>
        </div>
        <div className="mt-2 px-0.5">
          <h4 className="text-[13px] font-bold text-[#1F2A2A] truncate group-hover:text-[#E23744] transition-colors">
            {item.name}
          </h4>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[12px] font-bold text-[#1F2A2A]">
              Rs. {item.price}
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {item.prepTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Horizontal scroll section ────────────────────────────────────── */

function ScrollSection({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  items,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  items: MenuItemData[];
}) {
  if (items.length === 0) return null;

  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      gsap.fromTo(
        sectionRef.current.querySelector(".section-header"),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef}>
      <div className="section-header flex items-center gap-2.5 mb-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconColor}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1F2A2A] tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div
        className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <SuggestionCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */

export default function FoodDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const foodId = params.id;

  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [food, setFood] = useState<MenuItemData | null>(null);
  const [related, setRelated] = useState<MenuItemData[]>([]);
  const [topRated, setTopRated] = useState<MenuItemData[]>([]);
  const [trending, setTrending] = useState<MenuItemData[]>([]);

  const heroRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Fetch menu item data from API
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/public/menu-items/${foodId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setFood(data.item);
        setRelated(data.related || []);
        setTopRated(data.topRated || []);
        setTrending(data.trending || []);
        setQty(1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [foodId]);

  // GSAP entrance animations
  useGSAP(
    () => {
      if (!food || !heroRef.current || !detailsRef.current) return;

      const img = heroRef.current.querySelector("img");
      if (img) {
        gsap.fromTo(
          img,
          { scale: 1.3, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.4, ease: "power2.out" }
        );
      }

      gsap.fromTo(
        detailsRef.current,
        { opacity: 0, y: 80, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.3,
          ease: "back.out(1.2)",
        }
      );

      const els = gsap.utils.toArray<HTMLElement>(".detail-anim");
      gsap.fromTo(
        els,
        { opacity: 0, y: 25, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.07,
          delay: 0.5,
          ease: "power3.out",
        }
      );

      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { boxShadow: "0 4px 20px rgba(226,55,68,0.2)" },
          {
            boxShadow: "0 8px 40px rgba(226,55,68,0.4)",
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut",
          }
        );
      }
    },
    { dependencies: [food] }
  );

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (!food) return;
    for (let i = 0; i < qty; i++) {
      addItem(
        {
          id: food.id,
          name: food.name,
          price: food.price,
          image: img(food.imageUrl),
        },
        food.restaurant.id,
        food.restaurant.slug
      );
    }
    // Visual feedback
    if (ctaRef.current) {
      gsap.fromTo(
        ctaRef.current,
        { scale: 0.93 },
        { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" }
      );
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF5F5] to-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto h-10 w-10 text-[#E23744] animate-spin mb-4" />
          <p className="text-sm font-bold text-gray-400">Loading dish...</p>
        </motion.div>
      </div>
    );
  }

  // Error / Not Found
  if (error || !food) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF5F5] to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0F1] mb-5">
            <Utensils className="h-8 w-8 text-[#E23744]" />
          </div>
          <p className="text-xl font-bold text-[#1F2A2A]">Dish not found</p>
          <p className="text-sm text-gray-400 mt-1">
            This item might have been removed
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#E23744] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E23744]/20"
          >
            <ArrowLeft className="h-4 w-4" /> Browse Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ── Hero Image ────────────────────────────────────────── */}
      <div
        ref={heroRef}
        className="relative h-[40vh] sm:h-[48vh] md:h-[55vh] overflow-hidden bg-gray-200"
      >
        <img
          src={img(food.imageUrl)}
          alt={food.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        {/* Nav buttons */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 sm:px-6 z-20"
        >
          <button
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 backdrop-blur-xl text-white hover:bg-black/50 transition-all active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setLiked(!liked)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 backdrop-blur-xl text-white hover:bg-black/50 transition-all active:scale-90"
          >
            <Heart
              className={`h-5 w-5 transition-all duration-300 ${
                liked ? "fill-[#E23744] text-[#E23744] scale-110" : ""
              }`}
            />
          </button>
        </motion.div>

        {/* Bottom info on image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex items-end justify-between z-10"
        >
          <div>
            {food.discountLabel && (
              <span className="inline-block rounded-lg bg-[#E23744] px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-[#E23744]/30 mb-2">
                {food.discountLabel}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {food.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-0.5">
              {food.restaurant.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {food.isVeg && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E7B3E] shadow-lg">
                <Leaf className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white shadow-lg ${
                food.rating >= 4 ? "bg-[#1E7B3E]" : "bg-[#DB7C10]"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-white" />
              {food.rating.toFixed(1)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Details Card ──────────────────────────────────────── */}
      <div
        ref={detailsRef}
        className="relative -mt-6 mx-auto max-w-3xl px-4 sm:px-6"
      >
        <div className="rounded-3xl bg-white shadow-2xl shadow-black/5 p-5 sm:p-8 space-y-5 border border-gray-100/50">
          {/* Meta badges */}
          <div className="detail-anim flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFF0F1] px-3 py-1.5 text-[12px] font-bold text-[#E23744]">
              <Star className="h-3 w-3 fill-[#E23744]" />
              {food.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-600">
              <Clock className="h-3 w-3" />
              {food.prepTime}
            </span>
            {food.isVeg && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-[#E8F5E9] px-3 py-1.5 text-[12px] font-bold text-[#1E7B3E]">
                <Leaf className="h-3 w-3" /> Pure Veg
              </span>
            )}
            {food.badge && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-1.5 text-[12px] font-bold text-orange-600">
                {food.badge}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="detail-anim flex flex-wrap gap-1.5">
            {food.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-500 border border-gray-100"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-500 border border-gray-100">
              {food.category.name}
            </span>
          </div>

          {/* Description */}
          <div className="detail-anim">
            <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
              {food.description}
            </p>
          </div>

          {/* Restaurant info */}
          <div className="detail-anim flex items-center gap-3 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A4D3C] text-white">
              <Utensils className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#1F2A2A] truncate">
                {food.restaurant.name}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {food.restaurant.address}
              </p>
            </div>
            <Link
              href={`/menu/${food.restaurant.slug}`}
              className="shrink-0 text-[11px] font-bold text-[#E23744] flex items-center gap-0.5"
            >
              View Menu
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <hr className="detail-anim border-gray-100" />

          {/* Price & Quantity */}
          <div className="detail-anim flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1F2A2A]">
                  Rs. {food.price * qty}
                </span>
                {qty > 1 && (
                  <span className="text-xs sm:text-sm font-medium text-gray-400">
                    ({qty} × Rs. {food.price})
                  </span>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-1 rounded-2xl bg-gray-50 border border-gray-200 px-1 py-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white text-gray-600 hover:bg-gray-100 transition-all active:scale-90 shadow-sm"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <motion.span
                key={qty}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="w-8 sm:w-10 text-center text-lg font-extrabold text-[#1F2A2A]"
              >
                {qty}
              </motion.span>
              <button
                onClick={() => setQty(qty + 1)}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#E23744] text-white hover:bg-[#c92e3c] transition-all active:scale-90 shadow-sm shadow-[#E23744]/20"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* CTA */}
          <motion.button
            ref={ctaRef}
            onClick={handleAddToCart}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            className="detail-anim w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#E23744] to-[#FF6B81] py-4 text-base font-bold text-white shadow-xl shadow-[#E23744]/25 transition-all"
          >
            <ShoppingBag className="h-5 w-5" />
            Add to Cart — Rs. {food.price * qty}
          </motion.button>
        </div>
      </div>

      {/* ── Recommendations ───────────────────────────────────── */}
      <div className="mt-10 pb-14 mx-auto max-w-3xl px-4 sm:px-6 space-y-10">
        <ScrollSection
          title="Similar dishes"
          subtitle={`More from ${food.category.name}`}
          icon={Sparkles}
          iconColor="bg-gradient-to-br from-[#E23744] to-[#FF6B81]"
          items={related}
        />

        <ScrollSection
          title="Trending now"
          subtitle="Popular at this restaurant"
          icon={TrendingUp}
          iconColor="bg-gradient-to-br from-[#FF9933] to-[#FFB366]"
          items={trending}
        />

        <ScrollSection
          title="Top rated"
          subtitle="Highest rated dishes"
          icon={Award}
          iconColor="bg-gradient-to-br from-[#1E7B3E] to-[#34D058]"
          items={topRated}
        />
      </div>
    </div>
  );
}
