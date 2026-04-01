import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

const INACTIVE_DAYS = 15;

function getCutoffDate() {
  return new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/admin/inactive-users
 * Returns users who have been inactive for more than 15 days.
 * "Inactive" = account created >15 days ago AND no orders placed in the last 15 days.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const search = url.searchParams.get("search") || undefined;

  const cutoff = getCutoffDate();

  // Find users who placed an order recently — exclude them from inactive list
  const recentOrderUserIds = await db.order.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const activeIds = recentOrderUserIds.map((o) => o.userId);

  const where: Record<string, unknown> = {
    createdAt: { lt: cutoff }, // account older than 15 days
    id: { notIn: activeIds },  // no recent orders
    role: { not: "ADMIN" },    // never flag admin accounts
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        imageUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true, reviews: true } },
        orders: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "asc" }, // most inactive first
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  // Flatten lastOrderAt
  const result = users.map(({ orders, ...u }) => ({
    ...u,
    lastOrderAt: orders[0]?.createdAt ?? null,
  }));

  return NextResponse.json({
    users: result,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * PATCH /api/admin/inactive-users
 * Mark a user as active (resets their updatedAt, removing them from inactive list).
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Touch the user record so updatedAt moves forward, removing them from inactive list
  const user = await db.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user);
}
