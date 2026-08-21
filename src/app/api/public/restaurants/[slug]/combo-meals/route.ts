import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/restaurants/[slug]/combo-meals
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const combos = await db.comboMeal.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
              isAvailable: true,
            },
          },
        },
      },
      choiceGroups: {
        include: {
          options: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(combos);
}
