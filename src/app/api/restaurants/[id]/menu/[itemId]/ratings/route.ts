import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { rating, comment } = body;

  // Validate rating is an integer between 1 and 5
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "Rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  try {
    // Check that user has at least one DELIVERED order containing this menu item
    const hasOrdered = await db.order.findFirst({
      where: {
        userId: user.id,
        status: "DELIVERED",
        items: { some: { menuItemId: itemId } },
      },
    });

    if (!hasOrdered) {
      return NextResponse.json(
        { error: "You can only rate items you've ordered" },
        { status: 403 }
      );
    }

    // Upsert the rating (unique on [userId, menuItemId])
    const menuItemRating = await db.menuItemRating.upsert({
      where: {
        userId_menuItemId: { userId: user.id, menuItemId: itemId },
      },
      create: {
        rating,
        comment: comment || null,
        userId: user.id,
        menuItemId: itemId,
      },
      update: {
        rating,
        comment: comment || null,
      },
    });

    // Recalculate the MenuItem's average rating
    const avg = await db.menuItemRating.aggregate({
      where: { menuItemId: itemId },
      _avg: { rating: true },
    });

    await db.menuItem.update({
      where: { id: itemId },
      data: { rating: avg._avg.rating || 0 },
    });

    return NextResponse.json({
      rating: menuItemRating,
      averageRating: avg._avg.rating || 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;

  try {
    // Get average and count
    const aggregate = await db.menuItemRating.aggregate({
      where: { menuItemId: itemId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Get recent ratings with user name
    const ratings = await db.menuItemRating.findMany({
      where: { menuItemId: itemId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, imageUrl: true } },
      },
    });

    return NextResponse.json({
      average: aggregate._avg.rating || 0,
      count: aggregate._count.rating,
      ratings,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
