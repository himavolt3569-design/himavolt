import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { summarizePnl, parsePnlDate, defaultPnlRange } from "@/lib/pnl";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/restaurants/[id]/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Owner-only Profit & Loss for one restaurant: collected revenue vs recorded
 * expenses over the range, with per-category and per-day breakdowns.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { ownerId: true, name: true, currency: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const def = defaultPnlRange();
  const from = parsePnlDate(searchParams.get("from"), def.from);
  const toParam = parsePnlDate(searchParams.get("to"), def.to);
  const to = new Date(toParam);
  to.setUTCHours(23, 59, 59, 999);

  // Sequential (not Promise.all) — the runtime Prisma pool is small; see db.ts.
  const orders = await db.order.findMany({
    where: { restaurantId: id, createdAt: { gte: from, lte: to } },
    select: {
      total: true,
      status: true,
      createdAt: true,
      payment: { select: { status: true } },
      bill: { select: { total: true } },
    },
  });
  const expenses = await db.expense.findMany({
    where: { restaurantId: id, incurredAt: { gte: from, lte: to } },
    select: { category: true, amount: true, incurredAt: true },
  });

  const summary = summarizePnl(orders, expenses);

  return NextResponse.json({
    restaurant: { id, name: restaurant.name, currency: restaurant.currency },
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    ...summary,
  });
}
