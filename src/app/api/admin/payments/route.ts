import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/payments
 * All payments across all restaurants with filtering & pagination.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const status = url.searchParams.get("status") || undefined;
  const method = url.searchParams.get("method") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (method) where.method = method;

  if (search) {
    where.OR = [
      { transactionId: { contains: search, mode: "insensitive" } },
      { order: { orderNo: { contains: search, mode: "insensitive" } } },
      { order: { restaurant: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [payments, total, totals] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            total: true,
            restaurant: { select: { id: true, name: true, slug: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.payment.count({ where }),
    db.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    payments,
    summary: {
      totalAmount: totals._sum.amount ?? 0,
      totalCount: totals._count,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * DELETE /api/admin/payments
 * Permanently delete a payment record.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { paymentId } = await req.json();
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  await db.payment.delete({ where: { id: paymentId } });

  return NextResponse.json({ success: true });
}
