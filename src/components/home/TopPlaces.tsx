"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Star, MapPin, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { getTypeLabel } from "@/lib/restaurant-types";

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
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

function RestaurantImage({ restaurant }: { restaurant: Restaurant }) {
  const src = restaurant.imageUrl || restaurant.coverUrl || FALLBACK_IMAGE;
  return (
    <img
      src={src}
      alt={restaurant.name}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
    />
  );
}

function MobileCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <motion.div
      variants={itemVariants}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Link
        href={`/menu/${restaurant.slug}`}
        className="flex gap-4 py-4 border-b border-gray-100 last:border-b-0 group"
      >
        <div className="relative h-[120px] w-[120px] shrink-0 rounded-2xl overflow-hidden">
          <RestaurantImage restaurant={restaurant} />
          <motion.div
            className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-[#3e1e0c] px-2 py-0.5 rounded-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 400,
              damping: 15,
            }}
          >
            {getTypeLabel(restaurant.type)}
          </motion.div>
        </div>

        <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5">
          <h3 className="text-[15px] font-bold text-[#3e1e0c] leading-tight truncate">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            {restaurant.rating != null && (
              <>
                <Star className="h-3 w-3 fill-[#b25c1c] text-[#b25c1c]" />
                <span className="text-xs font-bold text-[#3e1e0c]">
                  {restaurant.rating.toFixed(1)}
                </span>
                <span className="text-gray-300">&middot;</span>
              </>
            )}
            <ShoppingBag className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {restaurant.totalOrders} orders
            </span>
          </div>
          <p className="flex items-center gap-1 text-[13px] text-gray-500 mt-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {restaurant.address}, {restaurant.city}
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
      whileHover={{
        y: -6,
        transition: { type: "spring", stiffness: 300, damping: 18 },
      }}
    >
      <Link href={`/menu/${restaurant.slug}`}>
        <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-xl group-hover:shadow-[#eaa94d]/8 transition-shadow duration-300">
          <RestaurantImage restaurant={restaurant} />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
          <motion.div
            className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-[#3e1e0c] px-2 py-0.5 rounded-md shadow-sm"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          >
            {getTypeLabel(restaurant.type)}
          </motion.div>
          {/* Rating badge */}
          {restaurant.rating != null && (
            <motion.div
              className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm"
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.35,
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
            >
              <Star className="h-3 w-3 fill-[#eaa94d] text-[#eaa94d]" />
              <span className="text-[10px] font-bold text-[#3e1e0c]">
                {restaurant.rating.toFixed(1)}
              </span>
            </motion.div>
          )}
        </div>

        <div className="pt-2.5">
          <h3 className="text-[15px] font-bold text-[#3e1e0c] leading-tight truncate group-hover:text-[#eaa94d] transition-colors">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            {restaurant.rating != null && (
              <>
                <Star className="h-3 w-3 fill-[#b25c1c] text-[#b25c1c]" />
                <span className="text-xs font-bold text-[#3e1e0c]">
                  {restaurant.rating.toFixed(1)}
                </span>
                <span className="text-gray-300 mx-0.5">&middot;</span>
              </>
            )}
            <ShoppingBag className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {restaurant.totalOrders} orders
            </span>
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {restaurant.address}, {restaurant.city}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TopPlaces() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Restaurant[]>("/api/public/restaurants?limit=8")
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-10 md:py-16">
        <motion.div
          className="mb-6 md:mb-8"
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <h2 className="text-xl font-bold tracking-tight text-[#3e1e0c] md:text-2xl">
            Popular Restaurants Near You
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-[#eaa94d]" />
          </div>
        ) : restaurants.length === 0 ? (
          <p className="text-center text-gray-500 py-16">
            No restaurants found
          </p>
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
              className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10"
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
