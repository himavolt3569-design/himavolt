 
 import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/restaurants/[id]/billing/reconciliation?date=2026-04-09
 * Daily reconciliation report: payment method breakdown, verified vs pending, discrepancies.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff or owner
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

  // Default to today
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all orders with payments for the day
  const orders = await db.order.findMany({
    where: {
      restaurantId: id,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      id: true,
      orderNo: true,
      status: true,
      total: true,
      payment: {
        select: {
          method: true,
          status: true,
          amount: true,
          transactionId: true,
          paidAt: true,
        },
      },
    },
  });

  // Method breakdown
  const methods = ["CASH", "ESEWA", "KHALTI", "BANK", "COUNTER", "DIRECT"];
  const byMethod: Record<string, {
    total: number;
    paid: number;
    pending: number;
    failed: number;
    expired: number;
    awaitingVerification: number;
    revenue: number;
  }> = {};

  for (const m of methods) {
    byMethod[m] = { total: 0, paid: 0, pending: 0, failed: 0, expired: 0, awaitingVerification: 0, revenue: 0 };
  }

  let totalOrders = 0;
  let paidOrders = 0;
  let unpaidOrders = 0;
  let totalRevenue = 0;
  let discrepancies: { orderNo: string; status: string; paymentMethod: string; paymentStatus: string }[] = [];

  for (const order of orders) {
    totalOrders++;
    const p = order.payment;

    if (!p) {
      unpaidOrders++;
      continue;
    }

    const bucket = byMethod[p.method] || { total: 0, paid: 0, pending: 0, failed: 0, expired: 0, awaitingVerification: 0, revenue: 0 };
    bucket.total++;

    if (p.status === "COMPLETED") {
      bucket.paid++;
      bucket.revenue += p.amount;
      paidOrders++;
      totalRevenue += p.amount;
    } else if (p.status === "PENDING") {
      bucket.pending++;
      unpaidOrders++;
    } else if (p.status === "FAILED") {
      bucket.failed++;
      unpaidOrders++;
    } else if (p.status === "EXPIRED") {
      bucket.expired++;
      unpaidOrders++;
    } else if (p.status === "AWAITING_VERIFICATION") {
      bucket.awaitingVerification++;
      unpaidOrders++;
    }

    // Discrepancy: order delivered/ready but payment not completed (any method)
    if (
      ["DELIVERED", "READY", "ACCEPTED", "PREPARING"].includes(order.status) &&
      p.status !== "COMPLETED"
    ) {
      discrepancies.push({
        orderNo: order.orderNo,
        status: order.status,
        paymentMethod: p.method,
        paymentStatus: p.status,
      });
    }
  }

  return NextResponse.json({
    date: targetDate.toISOString().split("T")[0],
    summary: {
      totalOrders,
      paidOrders,
      unpaidOrders,
      totalRevenue,
    },
    byMethod,
    discrepancies,
  });
}
