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

function durationMinutes(checkIn: Date, checkOut: Date | null): number | null {
  if (!checkOut) return null;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
}

// GET /api/restaurants/[id]/reports/staff/[staffId]?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> },
) {
  const { id, staffId } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await db.staffMember.findFirst({
    where: { id: staffId, restaurantId: id },
    select: {
      id: true,
      role: true,
      staffType: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
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

  const [orders, attendance, shifts] = await Promise.all([
    db.order.findMany({
      where: {
        restaurantId: id,
        processedByStaffId: staffId,
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        orderNo: true,
        total: true,
        type: true,
        status: true,
        createdAt: true,
        payment: { select: { method: true, status: true, amount: true } },
        bill: { select: { total: true } },
        items: { select: { name: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.staffAttendance.findMany({
      where: { staffId, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    }),
    db.shift.findMany({
      where: { staffId, restaurantId: id, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    }),
  ]);

  const nonCancelled = orders.filter(
    (o) => o.status !== "REJECTED",
  );
  const paid = nonCancelled.filter((o) => o.payment?.status === "COMPLETED");
  const revenue = paid.reduce((s, o) => s + (o.bill?.total ?? o.total), 0);
  const avgOrderValue = paid.length > 0 ? revenue / paid.length : 0;

  const trendMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of paid) {
    const k = o.createdAt.toISOString().slice(0, 10);
    const prev = trendMap.get(k) ?? { revenue: 0, orderCount: 0 };
    trendMap.set(k, {
      revenue: prev.revenue + (o.bill?.total ?? o.total),
      orderCount: prev.orderCount + 1,
    });
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: Math.round(v.revenue * 100) / 100,
      orderCount: v.orderCount,
    }));

  const methodMap = new Map<string, { count: number; amount: number }>();
  for (const o of paid) {
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

  return NextResponse.json({
    staff: {
      id: staff.id,
      name: staff.user.name,
      email: staff.user.email,
      phone: staff.user.phone ?? null,
      role: staff.role,
      staffType: staff.staffType,
    },
    range: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    totals: {
      revenue: Math.round(revenue * 100) / 100,
      orderCount: nonCancelled.length,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      paidCount: paid.length,
      unpaidCount: nonCancelled.length - paid.length,
    },
    trend,
    paymentMethods,
    orderTypes,
    attendance: attendance.map((a) => ({
      date: a.date.toISOString().slice(0, 10),
      checkIn: a.checkIn.toISOString(),
      checkOut: a.checkOut?.toISOString() ?? null,
      durationMinutes: durationMinutes(a.checkIn, a.checkOut),
      status: a.status,
    })),
    shifts: shifts.map((s) => ({
      id: s.id,
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      actualEndTime: s.actualEndTime?.toISOString() ?? null,
      label: s.label,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      total: o.bill?.total ?? o.total,
      createdAt: o.createdAt.toISOString(),
      type: o.type,
      status: o.status,
      payment: o.payment,
      items: o.items,
    })),
  });
}
