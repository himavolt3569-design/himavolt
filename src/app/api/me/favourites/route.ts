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
    },
  });

  return NextResponse.json(favourites);
}

/* POST /api/me/favourites — add a favourite */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { restaurantId } = body as { restaurantId?: string };

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const favourite = await db.favourite.upsert({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
    create: { userId: user.id, restaurantId },
    update: {},
  });

  return NextResponse.json(favourite, { status: 201 });
}

/* DELETE /api/me/favourites?restaurantId=xxx — remove a favourite */
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  await db.favourite.deleteMany({
    where: { userId: user.id, restaurantId },
  });

  return NextResponse.json({ ok: true });
}
