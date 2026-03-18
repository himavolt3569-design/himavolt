import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ratings = await db.menuItemRating.findMany({
    where: { userId: user.id },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true,
          restaurant: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ratings);
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { menuItemId, rating, comment } = body as {
    menuItemId?: string;
    rating?: number;
    comment?: string;
  };

  if (!menuItemId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
  }

  // Only allow rating items from delivered orders
  const hasOrdered = await db.orderItem.findFirst({
    where: {
      menuItemId,
      order: { userId: user.id, status: "DELIVERED" },
    },
  });

  if (!hasOrdered) {
    return NextResponse.json(
      { error: "You can only rate items you have ordered and received" },
      { status: 403 }
    );
  }

  // Upsert rating
  const existing = await db.menuItemRating.findFirst({
    where: { menuItemId, userId: user.id },
  });

  let result;
  if (existing) {
    result = await db.menuItemRating.update({
      where: { id: existing.id },
      data: { rating, comment: comment ?? null, updatedAt: new Date() },
    });
  } else {
    result = await db.menuItemRating.create({
      data: { menuItemId, userId: user.id, rating, comment: comment ?? null },
    });
  }

  // Recompute and persist average rating on the menu item
  const avg = await db.menuItemRating.aggregate({
    where: { menuItemId },
    _avg: { rating: true },
  });
  await db.menuItem.update({
    where: { id: menuItemId },
    data: { rating: avg._avg.rating ?? 0 },
  });

  return NextResponse.json(result);
}
