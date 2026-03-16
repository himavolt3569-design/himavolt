import { NextRequest, NextResponse } from "next/server";
import { getDailySummary } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

async function verifyStaffAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) return null;
  if (!["CASHIER", "MANAGER", "SUPER_ADMIN"].includes(staff.role)) return null;
  return staff;
}

// GET /api/restaurants/[id]/billing/summary — Daily billing summary
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await verifyStaffAccess(req, id);

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

  try {
    const summary = await getDailySummary(id);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json(
      { error: "Failed to get summary" },
      { status: 500 },
    );
  }
}
