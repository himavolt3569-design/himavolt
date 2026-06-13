import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const STATS_CACHE_TTL_MS = 15_000;

let cachedStats:
  | {
      data: unknown;
      expiresAt: number;
    }
  | null = null;

/**
 * Run a single stats query, degrading to a fallback (and logging) if it fails,
 * so one slow/failing metric can never take down the whole dashboard.
 */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[admin/stats] ${label} failed:`, err);
    return fallback;
  }
}

/**
 * GET /api/admin/stats
 * System-wide statistics for the admin dashboard.
 *
 * IMPORTANT: queries run SEQUENTIALLY, not in parallel. The production Postgres
 * pool is capped at a single connection (see src/lib/db.ts), so firing all of
 * these at once just makes them queue and trip the 3s connection timeout — which
 * previously 500'd this endpoint and left the Overview stuck. Sequential reuse
 * of the one connection is both correct and reliable here.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  if (cachedStats && cachedStats.expiresAt > Date.now()) {
    return NextResponse.json(cachedStats.data, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalUsers = await safe("totalUsers", () => db.user.count(), 0);
  const totalRestaurants = await safe("totalRestaurants", () => db.restaurant.count(), 0);
  const activeRestaurants = await safe(
    "activeRestaurants",
    () => db.restaurant.count({ where: { isActive: true } }),
    0,
  );
  const totalOrders = await safe("totalOrders", () => db.order.count(), 0);
  const todayOrders = await safe(
    "todayOrders",
    () => db.order.count({ where: { createdAt: { gte: todayStart } } }),
    0,
  );
  const weekOrders = await safe(
    "weekOrders",
    () => db.order.count({ where: { createdAt: { gte: weekAgo } } }),
    0,
  );
  const totalRevenue = await safe(
    "totalRevenue",
    () => db.order.aggregate({ _sum: { total: true } }),
    { _sum: { total: 0 } },
  );
  const todayRevenue = await safe(
    "todayRevenue",
    () => db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart } } }),
    { _sum: { total: 0 } },
  );
  const totalStaff = await safe(
    "totalStaff",
    () => db.staffMember.count({ where: { isActive: true } }),
    0,
  );
  const pendingOrders = await safe(
    "pendingOrders",
    () => db.order.count({ where: { status: "PENDING" } }),
    0,
  );
  const activeDeliveries = await safe(
    "activeDeliveries",
    () =>
      db.delivery.count({
        where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
      }),
    0,
  );
  const totalPayments = await safe(
    "totalPayments",
    () => db.payment.count({ where: { status: "COMPLETED" } }),
    0,
  );
  const recentAuditCount = await safe(
    "recentAuditCount",
    () => db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    0,
  );
  const ordersByStatus = await safe(
    "ordersByStatus",
    () => db.order.groupBy({ by: ["status"], _count: { status: true } }),
    [] as { status: string; _count: { status: number } }[],
  );
  const topRestaurants = await safe(
    "topRestaurants",
    () =>
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
    [] as {
      id: string;
      name: string;
      slug: string;
      totalOrders: number;
      rating: number;
      city: string;
    }[],
  );

  const statusBreakdown = Object.fromEntries(
    ordersByStatus.map((s) => [s.status, s._count.status]),
  );

  const data = {
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
  };

  cachedStats = {
    data,
    expiresAt: Date.now() + STATS_CACHE_TTL_MS,
  };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
