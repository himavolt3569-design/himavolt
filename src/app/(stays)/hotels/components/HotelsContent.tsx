"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ListingCard } from "@/components/design-system/composites/ListingCard";
import { Map, List } from "lucide-react";
import type { MapHotel } from "./HotelsMapView";

gsap.registerPlugin(ScrollTrigger);

// Leaflet can't run on the server — SSR-disabled dynamic import
const HotelsMapView = dynamic(
  () => import("./HotelsMapView").then((m) => m.HotelsMapView),
  { ssr: false, loading: () => <div className="w-full h-[520px] rounded-2xl bg-[var(--surface-alt)] animate-pulse" /> },
);

// Fallback images when the hotel has no photos set yet
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542314831-c6a4d14d8373?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop",
];

export type HotelCard = {
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
  heroSlides: { imageUrl: string }[];
  rooms: { price: number }[];
};

export function HotelsContent({ hotels }: { hotels: HotelCard[] }) {
  const [showMap, setShowMap] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // GSAP stagger reveal on mount and when switching back to grid
  useEffect(() => {
    if (showMap || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".listing-card-item");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "all",
      },
    );
  }, [showMap, hotels]);

  const mapHotels: MapHotel[] = hotels.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city,
    latitude: h.latitude,
    longitude: h.longitude,
    price: h.rooms[0]?.price ?? 0,
    rating: h.rating,
  }));

  return (
    <>
      {/* Map / List toggle — floats at the right */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowMap((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] bg-white shadow-sm text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
        >
          {showMap ? (
            <><List className="h-4 w-4" /> Show list</>
          ) : (
            <><Map className="h-4 w-4" /> Show map</>
          )}
        </button>
      </div>

      {showMap ? (
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm">
          <HotelsMapView hotels={mapHotels} />
        </div>
      ) : (
        <>
          {hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-5xl mb-4">🏔️</span>
              <h3 className="font-fraunces text-2xl font-bold text-[var(--text-1)] mb-2">No exact matches</h3>
              <p className="text-[var(--text-3)] max-w-sm">
                We couldn&apos;t find stays matching your search. Try adjusting your destination or dates.
              </p>
              <Link
                href="/hotels"
                className="mt-6 px-6 py-3 bg-[var(--accent)] text-white rounded-full font-semibold hover:bg-[var(--accent-hover)] transition-colors text-sm"
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-10"
            >
              {hotels.map((hotel, idx) => {
                let images: string[] = [];
                if (hotel.heroSlides.length > 0) images = hotel.heroSlides.map((s) => s.imageUrl);
                else if (hotel.coverUrl) images = [hotel.coverUrl];
                else if (hotel.imageUrl) images = [hotel.imageUrl];
                // Always fall back to beautiful placeholders so cards never look broken
                if (images.length === 0) images = [FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]];

                const lowestPrice = hotel.rooms[0]?.price ?? 0;

                return (
                  <Link key={hotel.id} href={`/hotel/${hotel.slug}`} className="listing-card-item">
                    <ListingCard
                      id={hotel.id}
                      title={hotel.name}
                      subtitle={hotel.city || "Nepal"}
                      images={images}
                      price={lowestPrice > 0 ? `Rs. ${lowestPrice.toLocaleString()}` : "Contact for price"}
                      priceSubtext={lowestPrice > 0 ? "night" : undefined}
                      rating={hotel.rating > 0 ? hotel.rating : undefined}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
