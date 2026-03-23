import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/users
 * All users with filtering & pagination.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const role = url.searchParams.get("role") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};

  if (role) where.role = role;

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
        _count: { select: { orders: true, ownedRestaurants: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * PATCH /api/admin/users
 * Update a user's role.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  const validRoles = ["CUSTOMER", "OWNER", "ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent admin from demoting themselves
  if (userId === admin.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
