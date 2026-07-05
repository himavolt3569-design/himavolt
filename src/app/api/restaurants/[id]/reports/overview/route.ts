import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const user = await getAuthUser();
  if (user) {
    const r = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId: user.id },
      select: { id: true },
    });
    if (r) return { authorized: true };
  }
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["MANAGER", "SUPER_ADMIN"].includes(staff.role)) {
    return { authorized: true };
  }
  return null;
}

function parseDate(s: string | null, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? fallback : d;
}

type OrderRow = {
  id: string;
  orderNo: string;
  total: number;
  type: string;
  status: string;
  createdAt: Date;
  processedByStaffId: string | null;
  payment: { method: string; status: string } | null;
  bill: { total: number } | null;
};

type TopItemRow = { name: string; quantity: number; revenue: number };

function bucketKey(date: Date, granularity: "hour" | "day"): string {
  const iso = date.toISOString();
  return granularity === "hour" ? iso.slice(0, 13) + ":00" : iso.slice(0, 10);
}

// GET /api/restaurants/[id]/reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=hour|day
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const from = parseDate(searchParams.get("from"), defaultFrom);
  const toParam = parseDate(searchParams.get("to"), now);
  const to = new Date(toParam);
  to.setUTCHours(23, 59, 59, 999);

  const granularityParam = searchParams.get("granularity");
  const granularity: "hour" | "day" = granularityParam === "hour" ? "hour" : "day";

  // Lean select — no nested `items`/`processedByStaff.user` joins, which used
  // to multiply one row per order into one row per order-item (the dominant
  // cost for busy restaurants, especially the "Lifetime" preset). topItems is
  // now a single SQL aggregate below; topStaff aggregates from this lean set
  // in JS and resolves names via one small follow-up lookup further down.
  const [allOrders, topItemsRaw] = await Promise.all([
    db.order.findMany({
      where: { restaurantId: id, createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        orderNo: true,
        total: true,
        type: true,
        status: true,
        createdAt: true,
        processedByStaffId: true,
        payment: { select: { method: true, status: true } },
        bill: { select: { total: true } },
      },
      orderBy: { createdAt: "asc" },
    }) as unknown as Promise<OrderRow[]>,
    // SUM(price * quantity) can't be expressed with Prisma's typed `_sum`
    // (it only sums a single column), so this one aggregate stays raw SQL.
    db.$queryRaw<{ name: string; quantity: bigint; revenue: number }[]>`
      SELECT oi.name, SUM(oi.quantity)::int AS quantity, SUM(oi.price * oi.quantity) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN payments p ON p."orderId" = o.id
      WHERE o."restaurantId" = ${id}
        AND o."createdAt" >= ${from}
        AND o."createdAt" <= ${to}
        AND o.status != 'REJECTED'
        AND p.status = 'COMPLETED'
      GROUP BY oi.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
  ]);

  const nonCancelled = allOrders.filter((o) => o.status !== "REJECTED");
  const cancelledCount = allOrders.length - nonCancelled.length;

  const paidOrders = nonCancelled.filter(
    (o) => o.payment?.status === "COMPLETED",
  );
  const deliveredOrders = nonCancelled.filter((o) => o.status === "ACCEPTED");

  const collectedRevenue = paidOrders.reduce(
    (s, o) => s + (o.bill?.total ?? o.total),
    0,
  );
  const billedRevenue = deliveredOrders.reduce(
    (s, o) => s + (o.bill?.total ?? o.total),
    0,
  );
  const unpaidOrderCount = nonCancelled.length - paidOrders.length;
  const avgOrderValue =
    paidOrders.length > 0 ? collectedRevenue / paidOrders.length : 0;

  const trendMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of paidOrders) {
    const k = bucketKey(o.createdAt, granularity);
    const prev = trendMap.get(k) ?? { revenue: 0, orderCount: 0 };
    trendMap.set(k, {
      revenue: prev.revenue + (o.bill?.total ?? o.total),
      orderCount: prev.orderCount + 1,
    });
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, v]) => ({
      bucket,
      revenue: Math.round(v.revenue * 100) / 100,
      orderCount: v.orderCount,
    }));

  const methodMap = new Map<string, { count: number; amount: number }>();
  for (const o of paidOrders) {
    if (!o.payment) continue;
    const prev = methodMap.get(o.payment.method) ?? { count: 0, amount: 0 };
    methodMap.set(o.payment.method, {
      count: prev.count + 1,
      amount: prev.amount + (o.bill?.total ?? o.total),
    });
  }
  const paymentMethods = Array.from(methodMap.entries()).map(
    ([method, v]) => ({
      method,
      count: v.count,
      amount: Math.round(v.amount * 100) / 100,
    }),
  );

  const typeMap = new Map<string, { count: number; amount: number }>();
  for (const o of nonCancelled) {
    const key = o.type ?? "DINE_IN";
    const prev = typeMap.get(key) ?? { count: 0, amount: 0 };
    typeMap.set(key, {
      count: prev.count + 1,
      amount: prev.amount + (o.bill?.total ?? o.total),
    });
  }
  const orderTypes = Array.from(typeMap.entries()).map(([type, v]) => ({
    type,
    count: v.count,
    amount: Math.round(v.amount * 100) / 100,
  }));

  const topItems: TopItemRow[] = topItemsRaw.map((r) => ({
    name: r.name,
    quantity: Number(r.quantity),
    revenue: Math.round(Number(r.revenue) * 100) / 100,
  }));

  const staffMap = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of paidOrders) {
    if (!o.processedByStaffId) continue;
    const prev = staffMap.get(o.processedByStaffId) ?? { orderCount: 0, revenue: 0 };
    staffMap.set(o.processedByStaffId, {
      orderCount: prev.orderCount + 1,
      revenue: prev.revenue + (o.bill?.total ?? o.total),
    });
  }
  const topStaffIds = Array.from(staffMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([staffId]) => staffId);

  // One tiny lookup for just the top 10 names instead of an outer join
  // (staff → user) repeated over every order row.
  const topStaffMembers = topStaffIds.length
    ? await db.staffMember.findMany({
        where: { id: { in: topStaffIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const staffNameById = new Map(topStaffMembers.map((s) => [s.id, s.user.name]));

  const topStaff = topStaffIds.map((staffId) => {
    const v = staffMap.get(staffId)!;
    return {
      staffId,
      name: staffNameById.get(staffId) ?? "Unknown",
      orderCount: v.orderCount,
      revenue: Math.round(v.revenue * 100) / 100,
    };
  });

  const discrepancies = deliveredOrders
    .filter((o) => o.payment?.status !== "COMPLETED")
    .map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      total: o.bill?.total ?? o.total,
      createdAt: o.createdAt.toISOString(),
      paymentStatus: o.payment?.status ?? null,
      paymentMethod: o.payment?.method ?? null,
    }));

  return NextResponse.json({
    range: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      granularity,
    },
    totals: {
      collectedRevenue: Math.round(collectedRevenue * 100) / 100,
      billedRevenue: Math.round(billedRevenue * 100) / 100,
      revenueGap: Math.round((billedRevenue - collectedRevenue) * 100) / 100,
      orderCount: nonCancelled.length,
      paidOrderCount: paidOrders.length,
      unpaidOrderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      cancelledCount,
    },
    trend,
    paymentMethods,
    orderTypes,
    topItems,
    topStaff,
    discrepancies,
  });
}
