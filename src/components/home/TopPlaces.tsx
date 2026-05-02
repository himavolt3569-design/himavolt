"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Star, MapPin, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { getTypeLabel } from "@/lib/restaurant-types";
import { useLocation } from "@/context/LocationContext";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number | null;
  totalOrders: number;
  openingTime: string | null;
  closingTime: string | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function RestaurantImage({ restaurant }: { restaurant: Restaurant }) {
  const src = restaurant.imageUrl || restaurant.coverUrl || FALLBACK_IMAGE;
  return (
    <div className="h-full w-full relative overflow-hidden">
      <img
        src={src}
        alt={restaurant.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[2s] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-40" />
    </div>
  );
}

function MobileCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <motion.div
      variants={itemVariants}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={`/menu/${restaurant.slug}`}
        className="flex gap-5 py-6 border-b border-[var(--border-soft)] last:border-b-0 group items-center"
      >
        <div className="relative h-[110px] w-[110px] shrink-0 rounded-[1.75rem] overflow-hidden shadow-focus">
          <RestaurantImage restaurant={restaurant} />
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md text-[9px] font-black text-slate-900 px-2 py-0.5 rounded-lg shadow-sm">
            {getTypeLabel(restaurant.type)}
          </div>
        </div>

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h3 className="text-base font-black text-[var(--text-1)] tracking-tight leading-none mb-2">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            {restaurant.rating != null && (
              <div className="flex items-center gap-1 bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                <Star className="h-2.5 w-2.5 fill-[var(--accent)] text-[var(--accent)]" />
                <span className="text-[10px] font-black text-[var(--accent-text)]">
                  {restaurant.rating.toFixed(1)}
                </span>
              </div>
            )}
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {restaurant.totalOrders} Orders
            </span>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-[var(--text-3)] font-medium truncate">
            <MapPin className="h-3 w-3 shrink-0 opacity-40" />
            {restaurant.address}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function DesktopCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <motion.div
      variants={itemVariants}
      className="group"
    >
      <Link href={`/menu/${restaurant.slug}`} className="block">
        <div className="relative w-full aspect-[1.1] rounded-[2.5rem] overflow-hidden bg-[var(--surface-alt)] shadow-sm transition-all duration-700 group-hover:shadow-focus group-hover:-translate-y-2">
          <RestaurantImage restaurant={restaurant} />
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="bg-white/90 backdrop-blur-md text-[10px] font-black text-slate-900 px-3 py-1 rounded-xl shadow-sm uppercase tracking-widest">
              {getTypeLabel(restaurant.type)}
            </div>
            {restaurant.rating != null && (
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm">
                <Star className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />
                <span className="text-[11px] font-black text-slate-900">
                  {restaurant.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Hover Action Reveal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="h-14 w-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
              <ArrowRight className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="pt-6 px-2">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-black text-[var(--text-1)] tracking-tighter leading-tight group-hover:text-[var(--accent)] transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Live" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {restaurant.totalOrders}
              </span>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-3)] font-medium mt-2">
            <MapPin className="h-3 w-3 opacity-40 shrink-0" />
            {restaurant.address}, {restaurant.city}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TopPlaces() {
  const { location } = useLocation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Restaurant[]>("/api/public/restaurants?limit=8")
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-[var(--canvas)] section-focus overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-[var(--accent)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">Handpicked Selection</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-[var(--text-1)] leading-[0.9]">
              Popular <br />
              <span className="text-[var(--text-3)]/30">Places.</span>
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-start md:items-end"
          >
             <p className="text-[var(--text-3)] font-medium mb-6 text-sm max-w-[200px] md:text-right">
                The most loved kitchens in {location.area === "Kathmandu" ? "the Valley" : location.area}.
             </p>
             <Link href="/hotel" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-1)]">
                View All Directory
                <div className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center transition-all group-hover:bg-[var(--text-1)] group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </div>
             </Link>
          </motion.div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[1.1] rounded-[2.5rem] bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-[var(--border)] rounded-[3rem]">
            <p className="text-[var(--text-3)] font-bold uppercase tracking-widest text-xs">Awaiting discovery</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="flex flex-col md:hidden"
            >
              {restaurants.map((r) => (
                <MobileCard key={r.id} restaurant={r} />
              ))}
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12"
            >
              {restaurants.map((r) => (
                <DesktopCard key={r.id} restaurant={r} />
              ))}
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

