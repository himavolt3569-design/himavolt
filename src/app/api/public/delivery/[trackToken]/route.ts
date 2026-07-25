import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * The customer's view of their delivery.
 *
 * Reached with the order's own `trackToken`, the same credential the tracking
 * page already holds — no new secret and no login for a guest who ordered by QR.
 *
 * What it deliberately does NOT return: the rider's phone number, the rider's
 * full location history, or anything about other orders. The customer gets the
 * rider's first name, the current position (only while in flight and only if the
 * restaurant enabled it), and how stale that position is.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackToken: string }> },
) {
  const { trackToken } = await params;

  try {
    const order = await db.order.findUnique({
      where: { trackToken },
      select: {
        id: true,
        type: true,
        deliveryLat: true,
        deliveryLng: true,
        restaurant: {
          select: {
            name: true,
            latitude: true,
            longitude: true,
            capability: { select: { liveTrackingEnabled: true } },
          },
        },
        delivery: {
          select: {
            id: true,
            status: true,
            distanceKm: true,
            estimatedMins: true,
            assignedAt: true,
            pickedUpAt: true,
            deliveredAt: true,
            driver: { select: { name: true } },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (order.type !== "DELIVERY" || !order.delivery) {
      return NextResponse.json({ isDelivery: false });
    }

    const d = order.delivery;
    const inFlight = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(d.status);
    const trackingOn = order.restaurant.capability?.liveTrackingEnabled ?? false;

    // Only the newest fix, and only while the rider is actually carrying this
    // order. The trail stays server-side.
    const lastPing =
      inFlight && trackingOn
        ? await db.driverLocationPing.findFirst({
            where: { deliveryId: d.id },
            orderBy: { recordedAt: "desc" },
            select: { latitude: true, longitude: true, recordedAt: true },
          })
        : null;

    return NextResponse.json(
      {
        isDelivery: true,
        status: d.status,
        distanceKm: d.distanceKm,
        estimatedMins: d.estimatedMins,
        assignedAt: d.assignedAt,
        pickedUpAt: d.pickedUpAt,
        deliveredAt: d.deliveredAt,
        riderName: d.driver?.name ?? null,
        restaurant: {
          name: order.restaurant.name,
          lat: order.restaurant.latitude,
          lng: order.restaurant.longitude,
        },
        dropoff: { lat: order.deliveryLat, lng: order.deliveryLng },
        rider: lastPing
          ? {
              lat: lastPing.latitude,
              lng: lastPing.longitude,
              // The UI says "updated Ns ago" rather than "live", because that is
              // what this actually is — a rider's phone can sleep or lose signal.
              updatedAt: lastPing.recordedAt,
            }
          : null,
        liveTrackingEnabled: trackingOn,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[public/delivery] GET failed", err);
    return NextResponse.json(
      { error: "Could not load delivery status." },
      { status: 503 },
    );
  }
}
