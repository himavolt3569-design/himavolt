import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/restaurants/[id]/feedback
 * Public — no auth required (anonymous-friendly).
 * Body: { rating?, comment?, name?, isAnonymous?, orderId? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const body = await req.json();
  const { rating, comment, name, isAnonymous = false, orderId } = body;

  if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  // Verify orderId belongs to this restaurant (if provided)
  if (orderId) {
    const order = await db.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const feedback = await db.feedback.create({
    data: {
      restaurantId,
      orderId: orderId ?? null,
      rating: rating ?? null,
      comment: comment?.trim() ?? null,
      name: isAnonymous ? null : (name?.trim() ?? null),
      isAnonymous,
    },
  });

  return NextResponse.json({ success: true, feedback }, { status: 201 });
}

/**
 * GET /api/restaurants/[id]/feedback
 * Staff/owner only — view all feedback for a restaurant.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
    if (!r || r.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [feedbacks, total] = await Promise.all([
    db.feedback.findMany({
      where: { restaurantId },
      include: {
        order: { select: { orderNo: true, tableNo: true, guestName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.feedback.count({ where: { restaurantId } }),
  ]);

  const avgRating = await db.feedback.aggregate({
    where: { restaurantId, rating: { not: null } },
    _avg: { rating: true },
  });

  return NextResponse.json({
    feedbacks,
    total,
    avgRating: avgRating._avg.rating ?? null,
  });
}
