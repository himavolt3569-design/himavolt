import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    const search = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = { isActive: true, isOpen: true };
    if (city) where.city = city;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const restaurants = await db.restaurant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        address: true,
        city: true,
        imageUrl: true,
        coverUrl: true,
        rating: true,
        totalOrders: true,
        openingTime: true,
        closingTime: true,
      },
      orderBy: { totalOrders: "desc" },
      take: limit,
    });

    return NextResponse.json(restaurants);
  } catch (err) {
    console.error("[API GET /api/public/restaurants]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
