import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { createExpenseSchema } from "@/lib/validations";
import { parsePnlDate, defaultPnlRange } from "@/lib/pnl";

type Params = { params: Promise<{ id: string }> };

/** Owner-only: expenses are the owner's private cost side of the P&L. */
async function requireOwner(restaurantId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  return !!restaurant && restaurant.ownerId === user.id;
}

/** GET /api/restaurants/[id]/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD — list. */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await requireOwner(id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const def = defaultPnlRange();
  const from = parsePnlDate(searchParams.get("from"), def.from);
  const toParam = parsePnlDate(searchParams.get("to"), def.to);
  const to = new Date(toParam);
  to.setUTCHours(23, 59, 59, 999);

  const expenses = await db.expense.findMany({
    where: { restaurantId: id, incurredAt: { gte: from, lte: to } },
    orderBy: { incurredAt: "desc" },
    select: {
      id: true,
      category: true,
      amount: true,
      note: true,
      incurredAt: true,
    },
  });

  return NextResponse.json({ expenses });
}

/** POST /api/restaurants/[id]/expenses — record a new expense. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await requireOwner(id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = createExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid expense" },
      { status: 400 },
    );
  }

  const { category, amount, note, incurredAt } = parsed.data;
  const when = incurredAt
    ? parsePnlDate(incurredAt, new Date())
    : new Date();

  const expense = await db.expense.create({
    data: {
      restaurantId: id,
      category,
      amount,
      note: note || null,
      incurredAt: when,
    },
    select: {
      id: true,
      category: true,
      amount: true,
      note: true,
      incurredAt: true,
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
