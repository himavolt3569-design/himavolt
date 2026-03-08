import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/stats
 * System-wide statistics for the admin dashboard.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalRestaurants,
    activeRestaurants,
    totalOrders,
    todayOrders,
    weekOrders,
    totalRevenue,
    todayRevenue,
    totalStaff,
    pendingOrders,
    activeDeliveries,
    totalPayments,
    recentAuditCount,
    ordersByStatus,
    topRestaurants,
  ] = await Promise.all([
    db.user.count(),
    db.restaurant.count(),
    db.restaurant.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { createdAt: { gte: weekAgo } } }),
    db.order.aggregate({ _sum: { total: true } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart } },
    }),
    db.staffMember.count({ where: { isActive: true } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.delivery.count({
      where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    }),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    db.restaurant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        totalOrders: true,
        rating: true,
        city: true,
      },
      orderBy: { totalOrders: "desc" },
      take: 5,
    }),
  ]);

  const statusBreakdown = Object.fromEntries(
    ordersByStatus.map((s) => [s.status, s._count.status]),
  );

  return NextResponse.json({
    users: { total: totalUsers },
    restaurants: {
      total: totalRestaurants,
      active: activeRestaurants,
    },
    orders: {
      total: totalOrders,
      today: todayOrders,
      thisWeek: weekOrders,
      pending: pendingOrders,
      byStatus: statusBreakdown,
    },
    revenue: {
      total: totalRevenue._sum.total ?? 0,
      today: todayRevenue._sum.total ?? 0,
    },
    staff: { active: totalStaff },
    deliveries: { active: activeDeliveries },
    payments: { completed: totalPayments },
    audit: { today: recentAuditCount },
    topRestaurants,
  });
}
