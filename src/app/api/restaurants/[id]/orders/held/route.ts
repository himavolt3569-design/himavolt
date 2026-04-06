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

  // Guard: isHeld column may not exist yet if migration hasn't run.
  // Use raw query to check existence, fall back to empty array if missing.
  try {
    const orders = await (db.order.findMany as Function)({
      where: {
        restaurantId: id,
        isHeld: true,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      select: {
        id: true,
        orderNo: true,
        tableNo: true,
        status: true,
        type: true,
        subtotal: true,
        tax: true,
        total: true,
        note: true,
        createdAt: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Column not yet in DB — return empty list gracefully
    if (msg.includes("does not exist") || msg.includes("column") || msg.includes("isHeld")) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: "Failed to fetch held orders" }, { status: 500 });
  }
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
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const updated = await (db.order.update as Function)({
      where: { id: orderId },
      data: {
        isHeld,
        heldAt: isHeld ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") || msg.includes("column") || msg.includes("isHeld")) {
      return NextResponse.json(
        { error: "Migration pending: run `npx prisma db push` with the direct DB URL to enable hold/recall." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
