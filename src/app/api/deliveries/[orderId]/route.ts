import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/deliveries/[orderId] — Get delivery status for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const delivery = await db.delivery.findUnique({
    where: { orderId },
    include: {
      order: {
        select: {
          orderNo: true,
          status: true,
          total: true,
          deliveryAddress: true,
          deliveryPhone: true,
          deliveryNote: true,
          restaurant: { select: { name: true, address: true, phone: true } },
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          vehicleType: true,
          vehicleNo: true,
          currentLat: true,
          currentLng: true,
          rating: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  return NextResponse.json(delivery);
}

// PATCH /api/deliveries/[orderId] — Update delivery (assign driver, change status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { status, driverId, estimatedMins, cancelReason } = body;

  const existing = await db.delivery.findUnique({ where: { orderId } });
  if (!existing) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  // Assign driver
  if (driverId) {
    const driver = await db.deliveryDriver.findUnique({
      where: { id: driverId },
    });
    if (!driver || !driver.isActive) {
      return NextResponse.json(
        { error: "Driver not found or inactive" },
        { status: 400 },
      );
    }
    updateData.driverId = driverId;
    updateData.assignedAt = new Date();
    if (!status) updateData.status = "ASSIGNED";
  }

  // Update status
  if (status) {
    const validStatuses = [
      "PENDING",
      "ASSIGNED",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid delivery status" },
        { status: 400 },
      );
    }

    updateData.status = status;

    if (status === "PICKED_UP") updateData.pickedUpAt = new Date();
    if (status === "DELIVERED") updateData.deliveredAt = new Date();
    if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason || "Cancelled";
    }
  }

  if (estimatedMins !== undefined) {
    updateData.estimatedMins = estimatedMins;
  }

  const delivery = await db.delivery.update({
    where: { orderId },
    data: updateData,
    include: {
      order: { select: { orderNo: true, status: true } },
      driver: {
        select: {
          name: true,
          phone: true,
          vehicleType: true,
          vehicleNo: true,
        },
      },
    },
  });

  // Sync order status when delivery is delivered
  if (status === "DELIVERED") {
    await db.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });

    // Update driver's trip count
    if (delivery.driverId) {
      await db.deliveryDriver.update({
        where: { id: delivery.driverId },
        data: { totalTrips: { increment: 1 } },
      });
    }
  }

  return NextResponse.json(delivery);
}
