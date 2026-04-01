import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/restaurants
 * All restaurants with owner info, stats, filtering & pagination.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const type = url.searchParams.get("type") || undefined;
  const isActive = url.searchParams.get("isActive");
  const search = url.searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};

  if (type) where.type = type;
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { owner: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [restaurants, total] = await Promise.all([
    db.restaurant.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, imageUrl: true } },
        _count: { select: { orders: true, staff: true, menuItems: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.restaurant.count({ where }),
  ]);

  return NextResponse.json({
    restaurants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * DELETE /api/admin/restaurants
 * Permanently delete a restaurant and all its data.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();
  // Support both single (restaurantId) and bulk (ids: string[]) delete
  const ids: string[] = body.ids ?? (body.restaurantId ? [body.restaurantId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "restaurantId or ids required" }, { status: 400 });
  }

  for (const restaurantId of ids) {
    await db.$transaction([
      db.delivery.deleteMany({ where: { order: { restaurantId } } }),
      db.payment.deleteMany({ where: { order: { restaurantId } } }),
      db.bill.deleteMany({ where: { order: { restaurantId } } }),
      db.tableSession.deleteMany({ where: { order: { restaurantId } } }),
      db.feedback.deleteMany({ where: { restaurantId } }),
      db.orderItem.deleteMany({ where: { order: { restaurantId } } }),
      db.order.deleteMany({ where: { restaurantId } }),
      db.restaurant.delete({ where: { id: restaurantId } }),
    ]);
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}

/**
 * PATCH /api/admin/restaurants
 * Toggle active status or update restaurant fields.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { restaurantId, isActive } = await req.json();

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  const restaurant = await db.restaurant.update({
    where: { id: restaurantId },
    data: updateData,
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json(restaurant);
}
