import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/me/orders/count
 * Returns the total number of orders this customer has placed. Used by the
 * profile page so we don't fetch up to 100 rows just to call `.length`.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await db.order.count({ where: { userId: user.id } });
  return NextResponse.json({ count });
}
