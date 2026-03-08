import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/audit
 * Query audit logs with filtering, pagination, and search.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const action = url.searchParams.get("action") || undefined;
  const entity = url.searchParams.get("entity") || undefined;
  const restaurantId = url.searchParams.get("restaurantId") || undefined;
  const userId = url.searchParams.get("userId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (restaurantId) where.restaurantId = restaurantId;
  if (userId) where.userId = userId;

  if (search) {
    where.OR = [
      { detail: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { entity: { contains: search, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, imageUrl: true } },
        restaurant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
