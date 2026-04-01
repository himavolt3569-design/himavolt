import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/deliveries
 * All deliveries with driver and order info.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const status = url.searchParams.get("status") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [deliveries, total] = await Promise.all([
    db.delivery.findMany({
      where,
      include: {
        driver: {
          select: { id: true, name: true, phone: true, vehicleType: true, vehicleNo: true, isOnline: true },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            total: true,
            deliveryAddress: true,
            deliveryPhone: true,
            restaurant: { select: { id: true, name: true, slug: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.delivery.count({ where }),
  ]);

  return NextResponse.json({
    deliveries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * DELETE /api/admin/deliveries
 * Delete one or many delivery records.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();
  const ids: string[] = body.ids ?? (body.deliveryId ? [body.deliveryId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "deliveryId or ids required" }, { status: 400 });
  }

  await db.delivery.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true, deleted: ids.length });
}
