import { NextRequest, NextResponse } from "next/server";
import { applyDiscount } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

async function verifyStaffAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (!staff) return null;
  // Only MANAGER and SUPER_ADMIN can apply discounts
  if (!["MANAGER", "SUPER_ADMIN"].includes(staff.role)) return null;
  return staff;
}

// POST /api/restaurants/[id]/billing/discount — Apply discount to a bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const staff = await verifyStaffAccess(req, id);

  if (!staff) {
    // Also try owner auth
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized — Manager access required" },
          { status: 401 },
        );
      }
      const restaurant = await db.restaurant.findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!restaurant || restaurant.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
  const { orderId, amount, reason } = body;

  if (!orderId || amount === undefined) {
    return NextResponse.json(
      { error: "orderId and amount are required" },
      { status: 400 },
    );
  }

  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json(
      { error: "Invalid discount amount" },
      { status: 400 },
    );
  }

  // Verify the order belongs to this restaurant
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const bill = await applyDiscount(orderId, amount, reason);
    return NextResponse.json({ success: true, bill });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to apply discount",
      },
      { status: 500 },
    );
  }
}
