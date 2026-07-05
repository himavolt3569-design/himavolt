"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import gsap from "gsap";
import { Map, List, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { ListingCard } from "@/components/design-system/composites/ListingCard";
import { ScrollableRow } from "@/components/shared/ScrollableRow";
import { cn } from "@/lib/utils";
import type { MapHotel } from "./HotelsMapView";

// Leaflet can't run on the server — SSR-disabled dynamic import.
const HotelsMapView = dynamic(
  () => import("./HotelsMapView").then((m) => m.HotelsMapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl bg-[var(--surface-alt)]" />
    ),
  },
);

const CATEGORIES = ["All Stays", "Hotels", "Resorts", "Guest Houses"] as const;

// Tasteful placeholders so cards never look broken before photos are set.
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop",
];

type HotelCard = {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  address: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  price: number;
};

type HotelsResponse = {
  hotels: HotelCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function HotelsBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showMap, setShowMap] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filters live in the URL so results are shareable and the hero search bar
  // (which writes the same params) stays the single source of truth.
  const dest = searchParams.get("dest") || "";
  const category = searchParams.get("category") || "All Stays";
  const adults = searchParams.get("adults") || "2";
  const children = searchParams.get("children") || "0";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);

  // Only the params the feed query depends on — keeps the cache key tight.
  const apiQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (dest) p.set("dest", dest);
    if (category !== "All Stays") p.set("category", category);
    if (adults !== "2") p.set("adults", adults);
    if (children !== "0") p.set("children", children);
    if (page > 1) p.set("page", String(page));
    return p.toString();
  }, [dest, category, adults, children, page]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["public-hotels", apiQuery],
    queryFn: () => apiFetch<HotelsResponse>(`/api/public/hotels?${apiQuery}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const hotels = data?.hotels ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Push a param change to the URL without a full navigation. Filter changes
  // reset pagination; page changes keep the rest intact.
  const setParam = (key: string, value: string | null, resetPage = true) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") p.delete(key);
    else p.set(key, value);
    if (resetPage) p.delete("page");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Minimal GSAP: a single soft stagger as cards enter. Runs only when the
  // grid content actually changes, and clears its own props afterwards.
  const firstId = hotels[0]?.id;
  useEffect(() => {
    if (showMap || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".listing-card-item");
    if (!cards.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "all",
        },
      );
    }, gridRef);
    return () => ctx.revert();
  }, [showMap, firstId, apiQuery]);

  const mapHotels: MapHotel[] = hotels.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city,
    latitude: h.latitude,
    longitude: h.longitude,
    price: h.price,
    rating: h.rating,
  }));

  const buildDetailHref = (slug: string) => {
    const p = new URLSearchParams();
    if (checkIn) p.set("checkIn", checkIn);
    if (checkOut) p.set("checkOut", checkOut);
    if (adults !== "2") p.set("adults", adults);
    const qs = p.toString();
    return `/hotel/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {/* Sticky category filter bar */}
      <div className="sticky top-[64px] z-30 bg-[var(--canvas)]/85 backdrop-blur-lg border-b border-[var(--border-soft)]">
        <ScrollableRow
          className="container mx-auto px-4 md:px-8"
          innerClassName="flex items-center gap-1.5 py-3"
          edgeColor="var(--canvas)"
        >
          {CATEGORIES.map((cat) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setParam("category", cat === "All Stays" ? null : cat)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95",
                  isActive
                    ? "bg-[var(--text-1)] text-white shadow-sm"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-alt)]",
                )}
              >
                {cat}
              </button>
            );
          })}
        </ScrollableRow>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-10 flex-1">
        {/* Result bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <p className="text-sm text-[var(--text-3)] font-medium flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {total > 0 ? (
              <span>
                {total} {total === 1 ? "stay" : "stays"}
                {dest ? ` near "${dest}"` : " in Nepal"}
              </span>
            ) : isFetching ? (
              <span>Finding stays...</span>
            ) : (
              <span>No stays found</span>
            )}
          </p>

          <button
            onClick={() => setShowMap((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-sm text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95 shrink-0"
          >
            {showMap ? (
              <><List className="h-4 w-4" /> <span className="hidden sm:inline">Show list</span></>
            ) : (
              <><Map className="h-4 w-4" /> <span className="hidden sm:inline">Show map</span></>
            )}
          </button>
        </div>

        {showMap ? (
          <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm">
            <HotelsMapView hotels={mapHotels} />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h3 className="font-fraunces text-2xl font-bold text-[var(--text-1)] mb-2">
              Could not load stays
            </h3>
            <p className="text-[var(--text-3)] max-w-sm mb-6">
              Something interrupted the connection. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-[var(--accent)] text-white rounded-full font-semibold hover:bg-[var(--accent-hover)] transition-colors text-sm active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : hotels.length === 0 && !isFetching ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h3 className="font-fraunces text-2xl font-bold text-[var(--text-1)] mb-2">
              No exact matches
            </h3>
            <p className="text-[var(--text-3)] max-w-sm">
              We could not find stays matching your search. Try adjusting your
              destination, dates, or guests.
            </p>
            <Link
              href="/hotels"
              className="mt-6 px-6 py-3 bg-[var(--accent)] text-white rounded-full font-semibold hover:bg-[var(--accent-hover)] transition-colors text-sm active:scale-95"
            >
              Clear all filters
            </Link>
          </div>
        ) : (
          <div
            ref={gridRef}
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-10 transition-opacity duration-200",
              isFetching && "opacity-60",
            )}
          >
            {hotels.map((hotel, idx) => {
              let images = hotel.images.length > 0 ? hotel.images : [];
              if (images.length === 0 && hotel.coverUrl) images = [hotel.coverUrl];
              if (images.length === 0 && hotel.imageUrl) images = [hotel.imageUrl];
              if (images.length === 0)
                images = [FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]];

              return (
                <Link
                  key={hotel.id}
                  href={buildDetailHref(hotel.slug)}
                  prefetch
                  className="listing-card-item transition-transform duration-300 hover:-translate-y-1"
                >
                  <ListingCard
                    id={hotel.id}
                    title={hotel.name}
                    subtitle={hotel.city || "Nepal"}
                    images={images}
                    price={hotel.price > 0 ? `Rs. ${hotel.price.toLocaleString()}` : "Contact for price"}
                    priceSubtext={hotel.price > 0 ? "night" : undefined}
                    rating={hotel.rating > 0 ? hotel.rating : undefined}
                  />
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!showMap && totalPages > 1 && (
          <div className="mt-14 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1), false)}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => setParam("page", n === 1 ? null : String(n), false)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors active:scale-95",
                    page === n
                      ? "bg-[var(--accent)] text-white"
                      : "hover:bg-[var(--surface-alt)] text-[var(--text-1)]",
                  )}
                >
                  {n}
                </button>
              ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1), false)}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
