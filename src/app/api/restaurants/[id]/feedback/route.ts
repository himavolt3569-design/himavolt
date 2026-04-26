import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

const COMMENT_MAX = 1000;
const NAME_MAX = 60;

/**
 * POST /api/restaurants/[id]/feedback
 * Public — no auth required (anonymous-friendly).
 * Body: { rating?, comment?, name?, isAnonymous?, orderId? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  // 5 reviews per minute per IP keeps spam-bombs out without blocking
  // legitimate small groups submitting feedback at the end of a meal.
  const limit = rateLimit(clientKey(req, "feedback"), 60_000, 5);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many feedback submissions. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

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

  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return NextResponse.json({ error: "comment must be a string" }, { status: 400 });
  }
  if (typeof comment === "string" && comment.length > COMMENT_MAX) {
    return NextResponse.json(
      { error: `comment is too long (max ${COMMENT_MAX} characters)` },
      { status: 400 },
    );
  }
  if (name !== undefined && name !== null && typeof name !== "string") {
    return NextResponse.json({ error: "name must be a string" }, { status: 400 });
  }
  if (typeof name === "string" && name.length > NAME_MAX) {
    return NextResponse.json(
      { error: `name is too long (max ${NAME_MAX} characters)` },
      { status: 400 },
    );
  }

  // Verify orderId belongs to this restaurant and hasn't already been reviewed.
  if (orderId) {
    const order = await db.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const existing = await db.feedback.findFirst({ where: { orderId } });
    if (existing) {
      return NextResponse.json(
        { error: "This order already has feedback" },
        { status: 409 },
      );
    }
  }

  const feedback = await db.feedback.create({
    data: {
      restaurantId,
      orderId: orderId ?? null,
      rating: rating ?? null,
      comment: typeof comment === "string" ? comment.trim().slice(0, COMMENT_MAX) : null,
      name: isAnonymous
        ? null
        : typeof name === "string"
          ? name.trim().slice(0, NAME_MAX) || null
          : null,
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
