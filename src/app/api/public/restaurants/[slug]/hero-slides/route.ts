import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const slides = await db.heroSlide.findMany({
    where: {
      restaurantId: restaurant.id,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      imageUrl: true,
      title: true,
      subtitle: true,
      sortOrder: true,
      linkItemId: true,
      linkItem: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(slides);
}
