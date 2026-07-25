import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRestaurantAccess } from "@/lib/access-control";
import type { Prisma } from "@/generated/prisma";

/**
 * The delivery hub's feed.
 *
 * One endpoint serves every tab. Filtering happens server-side so a station view
 * never ships rows it then hides — which would leak other orders into the
 * browser and make the payload grow with the whole day's volume.
 */

const ACTIVE_STATUSES = [
  "PENDING",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tab = req.nextUrl.searchParams.get("tab") ?? "live";
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 1),
    100,
  );

  // Tenant scope is on the ORDER relation — a Delivery has no restaurantId of
  // its own, so this is the only thing standing between tenants. There is no RLS.
  const where: Prisma.DeliveryWhereInput = { order: { restaurantId: id } };

  switch (tab) {
    case "live":
    case "dispatch":
      where.status = { in: [...ACTIVE_STATUSES] };
      break;
    case "food":
      where.status = { in: [...ACTIVE_STATUSES] };
      where.order = {
        restaurantId: id,
        prepGroups: { some: { station: { in: ["FOOD", "DESSERT"] } } },
      };
      break;
    case "drinks":
      where.status = { in: [...ACTIVE_STATUSES] };
      where.order = {
        restaurantId: id,
        prepGroups: { some: { station: { in: ["DRINKS", "BAR"] } } },
      };
      break;
    case "history":
      where.status = { in: ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"] };
      break;
  }

  try {
    const deliveries = await db.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        fee: true,
        finalFee: true,
        distanceKm: true,
        estimatedMins: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        cancelReason: true,
        createdAt: true,
        riderToken: true,
        driver: { select: { id: true, name: true, phone: true, isOnline: true } },
        order: {
          select: {
            id: true,
            orderNo: true,
            total: true,
            status: true,
            kitchenStatus: true,
            deliveryAddress: true,
            deliveryPhone: true,
            deliveryNote: true,
            guestName: true,
            createdAt: true,
            payment: { select: { method: true, status: true, amount: true } },
            prepGroups: {
              select: { station: true, status: true, readyAt: true },
              orderBy: { station: "asc" },
            },
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                prepGroup: { select: { station: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { deliveries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[deliveries] GET failed", err);
    return NextResponse.json(
      { error: "Could not load deliveries. Please try again." },
      { status: 503 },
    );
  }
}
