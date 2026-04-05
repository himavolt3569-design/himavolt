import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff && staff.restaurantId === restaurantId) return true;

  const user = await getOrCreateUser();
  if (!user) return false;
  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  return !!restaurant;
}

// GET /api/restaurants/[id]/orders/held — Fetch held orders
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await verifyAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    where: {
      restaurantId: id,
      isHeld: true,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// PATCH /api/restaurants/[id]/orders/held — Toggle hold status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await verifyAccess(req, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, isHeld } = body;

  if (!orderId || typeof isHeld !== "boolean") {
    return NextResponse.json(
      { error: "orderId and isHeld (boolean) are required" },
      { status: 400 },
    );
  }

  // Verify order belongs to this restaurant
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      isHeld,
      heldAt: isHeld ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, order: updated });
}
