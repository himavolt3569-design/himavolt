import React from "react";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import Link from "next/link";
import { HotelSearchHero } from "./components/HotelSearchHero";
import { HotelsCinematicBg } from "./components/HotelsCinematicBg";
import { HotelsContent } from "./components/HotelsContent";

export const metadata = {
  title: "Stays by HimaVolt — Discover Luxury Hotels in Nepal",
  description:
    "Discover luxury hotels, boutique resorts, and mountain retreats across Nepal with HimaVolt.",
  openGraph: { title: "Stays by HimaVolt", siteName: "HimaVolt" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const CATEGORIES = [
  "All Stays",
  "Luxury Resorts",
  "Boutique Hotels",
  "Mountain Retreats",
  "Villas",
];

export default async function HotelsDiscoveryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const dest      = typeof searchParams.dest     === "string" ? searchParams.dest     : undefined;
  const adults    = typeof searchParams.adults   === "string" ? parseInt(searchParams.adults) : 2;
  const children  = typeof searchParams.children === "string" ? parseInt(searchParams.children) : 0;
  const checkIn   = typeof searchParams.checkIn  === "string" ? searchParams.checkIn  : undefined;
  const checkOut  = typeof searchParams.checkOut === "string" ? searchParams.checkOut : undefined;
  const page      = typeof searchParams.page     === "string" ? parseInt(searchParams.page) : 1;
  const category  = typeof searchParams.category === "string" ? searchParams.category : "All Stays";

  const totalGuests = adults + children;

  const where: Prisma.RestaurantWhereInput = {
    type: { in: ["HOTEL", "RESORT", "GUEST_HOUSE"] },
    isActive: true,
  };

  if (dest) {
    where.OR = [
      { city:    { contains: dest, mode: "insensitive" } },
      { address: { contains: dest, mode: "insensitive" } },
      { name:    { contains: dest, mode: "insensitive" } },
    ];
  }

  where.rooms = {
    some: { isActive: true, maxGuests: { gte: totalGuests } },
  };

  // Sequential transaction — prod DB pool = 1 connection; Promise.all would deadlock
  const [hotels, totalCount] = await db.$transaction([
    db.restaurant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        city: true,
        address: true,
        imageUrl: true,
        coverUrl: true,
        rating: true,
        latitude: true,
        longitude: true,
        heroSlides: {
          where: { isActive: true },
          select: { imageUrl: true },
          take: 5,
        },
        rooms: {
          where: { isActive: true },
          select: { price: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
      orderBy: { rating: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.restaurant.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Build pagination URL helper
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (dest)     params.set("dest",     dest);
    if (checkIn)  params.set("checkIn",  checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (adults !== 2) params.set("adults", adults.toString());
    if (children > 0) params.set("children", children.toString());
    if (category !== "All Stays") params.set("category", category);
    params.set("page", p.toString());
    return `/hotels?${params.toString()}`;
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── 1. Cinematic Hero ── */}
      <section className="relative h-[78vh] min-h-[560px] w-full flex flex-col items-center justify-center">
        <HotelsCinematicBg />

        {/* Search hero sits above the background */}
        <div className="relative z-10 flex flex-col items-center w-full px-4">
          <HotelSearchHero />
        </div>

        {/* Subtle scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce opacity-60">
          <span className="text-white text-[10px] font-bold uppercase tracking-widest">Scroll</span>
          <div className="w-0.5 h-6 bg-white/60 rounded-full" />
        </div>
      </section>

      {/* ── 2. Sticky Category Filter Bar ── */}
      <section className="sticky top-[64px] z-30 bg-[var(--canvas)]/90 backdrop-blur-lg border-b border-[var(--border-soft)]">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
            {CATEGORIES.map((cat) => {
              const params = new URLSearchParams();
              if (dest)     params.set("dest",     dest);
              if (checkIn)  params.set("checkIn",  checkIn);
              if (checkOut) params.set("checkOut", checkOut);
              if (adults !== 2) params.set("adults", adults.toString());
              if (children > 0) params.set("children", children.toString());
              if (cat !== "All Stays") params.set("category", cat);

              const isActive = category === cat;
              return (
                <Link
                  key={cat}
                  href={`/hotels?${params.toString()}`}
                  scroll={false}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[var(--text-1)] text-white"
                      : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Main Content: Grid or Map ── */}
      <section className="container mx-auto px-4 md:px-8 py-10 flex-1">

        {/* Result count */}
        {totalCount > 0 && (
          <p className="text-sm text-[var(--text-3)] font-medium mb-6">
            {totalCount} {totalCount === 1 ? "property" : "properties"}
            {dest ? ` near "${dest}"` : " in Nepal"}
          </p>
        )}

        <HotelsContent hotels={hotels} />

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                scroll={false}
                className="px-4 py-2 rounded-full border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors"
              >
                ← Prev
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <Link
                  key={n}
                  href={buildPageUrl(n)}
                  scroll={false}
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    page === n
                      ? "bg-[var(--accent)] text-white"
                      : "hover:bg-[var(--surface-alt)] text-[var(--text-1)]"
                  }`}
                >
                  {n}
                </Link>
              ))}
            {page < totalPages && (
              <Link
                href={buildPageUrl(page + 1)}
                scroll={false}
                className="px-4 py-2 rounded-full border border-[var(--border)] text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
