import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

/* GET /api/me/favourites — list user's favourite restaurants */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favourites = await db.favourite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          imageUrl: true,
          rating: true,
          city: true,
          address: true,
        },
      },
      menuItem: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          rating: true,
          isAvailable: true,
          restaurantId: true,
        }
      }
    },
  });

  return NextResponse.json(favourites);
}

/* POST /api/me/favourites — add a favourite */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { restaurantId, menuItemId } = body as { restaurantId?: string, menuItemId?: string };

  if (!restaurantId && !menuItemId) {
    return NextResponse.json({ error: "restaurantId or menuItemId is required" }, { status: 400 });
  }

  if (restaurantId) {
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    const existing = await db.favourite.findFirst({ where: { userId: user.id, restaurantId } });
    if (existing) return NextResponse.json(existing, { status: 201 });
    const favourite = await db.favourite.create({ data: { userId: user.id, restaurantId } });
    return NextResponse.json(favourite, { status: 201 });
  }

  if (menuItemId) {
    const menuItem = await db.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    const existing = await db.favourite.findFirst({ where: { userId: user.id, menuItemId } });
    if (existing) return NextResponse.json(existing, { status: 201 });
    const favourite = await db.favourite.create({ data: { userId: user.id, menuItemId } });
    return NextResponse.json(favourite, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

/* DELETE /api/me/favourites?restaurantId=xxx — remove a favourite */
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const menuItemId = req.nextUrl.searchParams.get("menuItemId");

  if (!restaurantId && !menuItemId) {
    return NextResponse.json({ error: "restaurantId or menuItemId is required" }, { status: 400 });
  }

  if (restaurantId) {
    await db.favourite.deleteMany({
      where: { userId: user.id, restaurantId },
    });
  } else if (menuItemId) {
    await db.favourite.deleteMany({
      where: { userId: user.id, menuItemId },
    });
  }

  return NextResponse.json({ ok: true });
}
