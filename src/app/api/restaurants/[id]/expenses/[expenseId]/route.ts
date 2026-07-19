import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; expenseId: string }> };

/** DELETE /api/restaurants/[id]/expenses/[expenseId] — owner-only. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, expenseId } = await params;

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

  // Scope the delete to this restaurant so an expense id can't be deleted
  // across tenants even if guessed.
  const result = await db.expense.deleteMany({
    where: { id: expenseId, restaurantId: id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
