import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

// Public stays discovery feed. Powers the client-side TanStack grid on /hotels
// so the page shell can paint instantly and filter changes stay on the client
// (no full server re-render per keystroke).

const PAGE_SIZE = 12;
const HOTEL_TYPES = ["HOTEL", "RESORT", "GUEST_HOUSE"] as const;

// Category label -> Restaurant.type. "All Stays" applies no type narrowing.
const CATEGORY_TYPE: Record<string, (typeof HOTEL_TYPES)[number]> = {
  Hotels: "HOTEL",
  Resorts: "RESORT",
  "Guest Houses": "GUEST_HOUSE",
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const dest = searchParams.get("dest")?.trim() || undefined;
  const category = searchParams.get("category") || "All Stays";
  const adults = Math.max(1, parseInt(searchParams.get("adults") || "2") || 2);
  const children = Math.max(0, parseInt(searchParams.get("children") || "0") || 0);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const totalGuests = adults + children;

  const typeFilter = CATEGORY_TYPE[category];

  const where: Prisma.RestaurantWhereInput = {
    isActive: true,
    rooms: { some: { isActive: true, maxGuests: { gte: totalGuests } } },
  };

  // Base type filter: either specific type, or any stay-type venue OR any venue with HOTEL_HUB enabled
  const typeCondition: Prisma.RestaurantWhereInput = typeFilter
    ? { type: typeFilter }
    : {
        OR: [
          { type: { in: [...HOTEL_TYPES] } },
          { featuresEnabled: { has: "HOTEL_HUB" } },
        ],
      };

  if (dest) {
    where.AND = [
      typeCondition,
      {
        OR: [
          { city: { contains: dest, mode: "insensitive" } },
          { address: { contains: dest, mode: "insensitive" } },
          { name: { contains: dest, mode: "insensitive" } },
        ],
      },
    ];
  } else {
    // Merge the type condition directly if no destination filter
    Object.assign(where, typeCondition);
  }

  // Sequential transaction — prod DB pool is small; keep queries batched.
  const [rows, total] = await db.$transaction([
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

  const hotels = rows.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    type: h.type,
    city: h.city,
    address: h.address,
    imageUrl: h.imageUrl,
    coverUrl: h.coverUrl,
    rating: h.rating,
    latitude: h.latitude,
    longitude: h.longitude,
    images: h.heroSlides.map((s) => s.imageUrl),
    price: h.rooms[0]?.price ?? 0,
  }));

  return NextResponse.json({
    hotels,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
