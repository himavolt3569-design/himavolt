import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

const PAYMENT_METHODS = ["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"];

/**
 * GET /api/restaurants/[id]/billing/staff-report?date=2026-04-12
 * Payment collection report grouped by staff member.
 * Shows each staff's total collected, by payment method, for the given date.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff (CASHIER+) or owner
  const staff = await requireStaffForRestaurant(req, id);
  if (!staff) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Orders processed by staff today with COMPLETED payments
  const orders = await db.order.findMany({
    where: {
      restaurantId: id,
      createdAt: { gte: startOfDay, lte: endOfDay },
      payment: { status: "COMPLETED" },
    },
    select: {
      id: true,
      orderNo: true,
      total: true,
      status: true,
      createdAt: true,
      processedByStaffId: true,
      processedByStaff: {
        select: {
          id: true,
          role: true,
          staffType: true,
          user: { select: { name: true, email: true } },
          shifts: {
            where: {
              date: { gte: startOfDay, lte: endOfDay },
              restaurantId: id,
            },
            select: { startTime: true, endTime: true, label: true },
            take: 1,
          },
        },
      },
      payment: {
        select: {
          method: true,
          status: true,
          amount: true,
          paidAt: true,
          transactionId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by processedByStaffId
  const staffMap = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      staffEmail: string;
      role: string;
      staffType: string;
      shift: { startTime: string; endTime: string; label: string | null } | null;
      orderCount: number;
      totalCollected: number;
      byMethod: Record<string, { count: number; amount: number }>;
      orders: { orderNo: string; amount: number; method: string; paidAt: string | null }[];
    }
  >();

  // Bucket for orders not attributed to any staff
  const unattributedKey = "__unattributed__";

  for (const order of orders) {
    if (!order.payment || order.payment.status !== "COMPLETED") continue;

    const key = order.processedByStaffId || unattributedKey;

    if (!staffMap.has(key)) {
      const s = order.processedByStaff;
      const byMethod: Record<string, { count: number; amount: number }> = {};
      for (const m of PAYMENT_METHODS) byMethod[m] = { count: 0, amount: 0 };

      staffMap.set(key, {
        staffId: s?.id || unattributedKey,
        staffName: s?.user.name || "Unknown / No Staff",
        staffEmail: s?.user.email || "",
        role: s?.role || "UNKNOWN",
        staffType: s?.staffType || "FULL_TIME",
        shift: s?.shifts?.[0] || null,
        orderCount: 0,
        totalCollected: 0,
        byMethod,
        orders: [],
      });
    }

    const entry = staffMap.get(key)!;
    const method = order.payment.method;
    const amount = order.payment.amount;

    entry.orderCount++;
    entry.totalCollected += amount;
    if (entry.byMethod[method]) {
      entry.byMethod[method].count++;
      entry.byMethod[method].amount += amount;
    }
    entry.orders.push({
      orderNo: order.orderNo,
      amount,
      method,
      paidAt: order.payment.paidAt?.toISOString() || null,
    });
  }

  // Also fetch all staff members for this restaurant to include zero-revenue staff
  const allStaff = await db.staffMember.findMany({
    where: { restaurantId: id, isActive: true },
    select: {
      id: true,
      role: true,
      staffType: true,
      user: { select: { name: true, email: true } },
      shifts: {
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          restaurantId: id,
        },
        select: { startTime: true, endTime: true, label: true },
        take: 1,
      },
    },
  });

  // Add staff members who worked today but didn't process any orders
  for (const s of allStaff) {
    if (staffMap.has(s.id)) continue;
    const byMethod: Record<string, { count: number; amount: number }> = {};
    for (const m of PAYMENT_METHODS) byMethod[m] = { count: 0, amount: 0 };
    staffMap.set(s.id, {
      staffId: s.id,
      staffName: s.user.name || "Staff",
      staffEmail: s.user.email,
      role: s.role,
      staffType: s.staffType,
      shift: s.shifts?.[0] || null,
      orderCount: 0,
      totalCollected: 0,
      byMethod,
      orders: [],
    });
  }

  const staffList = Array.from(staffMap.values()).sort(
    (a, b) => b.totalCollected - a.totalCollected,
  );

  const grandTotal = staffList.reduce((sum, s) => sum + s.totalCollected, 0);
  const grandOrderCount = staffList.reduce((sum, s) => sum + s.orderCount, 0);

  return NextResponse.json({
    date: targetDate.toISOString().split("T")[0],
    grandTotal,
    grandOrderCount,
    staff: staffList,
  });
}
