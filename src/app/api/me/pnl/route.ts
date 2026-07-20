import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { summarizePnl, parsePnlDate, defaultPnlRange } from "@/lib/pnl";

/**
 * GET /api/me/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Owner-wide Profit & Loss: one combined statement across every restaurant the
 * signed-in owner owns, plus a per-restaurant breakdown. For a single-restaurant
 * owner this is just that one venue.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurants = await db.restaurant.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, currency: true },
    orderBy: { createdAt: "asc" },
  });

  const { searchParams } = new URL(req.url);
  const def = defaultPnlRange();
  const from = parsePnlDate(searchParams.get("from"), def.from);
  const toParam = parsePnlDate(searchParams.get("to"), def.to);
  const to = new Date(toParam);
  to.setUTCHours(23, 59, 59, 999);

  const range = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };

  if (restaurants.length === 0) {
    return NextResponse.json({
      range,
      currency: "NPR",
      mixedCurrencies: false,
      restaurantCount: 0,
      combined: summarizePnl([], []),
      restaurants: [],
    });
  }

  const ids = restaurants.map((r) => r.id);

  // Two range-scoped reads across all the owner's venues, then grouped in JS —
  // so the query count doesn't grow with the number of restaurants.
  const orders = await db.order.findMany({
    where: { restaurantId: { in: ids }, createdAt: { gte: from, lte: to } },
    select: {
      restaurantId: true,
      total: true,
      status: true,
      createdAt: true,
      payment: { select: { status: true } },
      bill: { select: { total: true } },
    },
  });
  const expenses = await db.expense.findMany({
    where: { restaurantId: { in: ids }, incurredAt: { gte: from, lte: to } },
    select: { restaurantId: true, category: true, amount: true, incurredAt: true },
  });

  const combined = summarizePnl(orders, expenses);

  const perRestaurant = restaurants.map((r) => {
    const s = summarizePnl(
      orders.filter((o) => o.restaurantId === r.id),
      expenses.filter((e) => e.restaurantId === r.id),
    );
    return {
      id: r.id,
      name: r.name,
      currency: r.currency,
      revenue: s.revenue,
      expenses: s.expenses,
      netProfit: s.netProfit,
      margin: s.margin,
      ordersCount: s.ordersCount,
    };
  });

  // Aggregation assumes a common currency; flag it when they differ so the UI
  // can caveat the combined totals.
  const currencies = new Set(restaurants.map((r) => r.currency));
  const mixedCurrencies = currencies.size > 1;

  return NextResponse.json({
    range,
    currency: restaurants[0].currency,
    mixedCurrencies,
    restaurantCount: restaurants.length,
    combined,
    restaurants: perRestaurant,
  });
}
