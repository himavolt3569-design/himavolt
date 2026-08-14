import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyDeliveryChanged } from "@/lib/realtime";
import { isValidLatLng } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import { z } from "zod";

/**
 * A rider's location while a delivery is in flight.
 *
 * Stored as history on `DriverLocationPing`, not as a moving pointer on the
 * driver row: a rider runs many deliveries, and a single `currentLat/Lng` loses
 * the trail, makes disputes unresolvable, and makes retention impossible to
 * reason about. Pings are purged 7 days after the delivery finishes.
 *
 * Only accepted while the delivery is actually in flight — no background
 * location harvesting before pickup or after handover.
 */

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000).optional(),
});

const TRACKABLE = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // The rider page posts every 10–20s; this allows for that plus retries while
  // still capping a runaway or malicious client.
  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`rider-ping:${ip}`, 60_000, 30);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many pings." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds || 60) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = pingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }
  const { latitude, longitude, accuracyM } = parsed.data;
  if (!isValidLatLng(latitude, longitude)) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  try {
    const delivery = await db.delivery.findUnique({
      where: { riderToken: token },
      select: {
        id: true,
        status: true,
        driverId: true,
        order: {
          select: {
            id: true,
            restaurantId: true,
            restaurant: {
              select: { capability: { select: { liveTrackingEnabled: true } } },
            },
          },
        },
      },
    });

    if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Silently accepted-but-discarded when the restaurant has live tracking off:
    // the rider page should not have been pinging, and a 4xx here would put a
    // confusing error in front of someone mid-delivery.
    if (!delivery.order.restaurant.capability?.liveTrackingEnabled) {
      return NextResponse.json({ ok: true, recorded: false });
    }

    if (!(TRACKABLE as readonly string[]).includes(delivery.status)) {
      return NextResponse.json({ ok: true, recorded: false });
    }

    await db.$transaction([
      db.driverLocationPing.create({
        data: {
          deliveryId: delivery.id,
          driverId: delivery.driverId,
          latitude,
          longitude,
          accuracyM: accuracyM ?? null,
        },
      }),
      // The driver row keeps the latest fix for the dispatch board's "who is
      // where" view; the ping table keeps the trail.
      ...(delivery.driverId
        ? [
            db.deliveryDriver.update({
              where: { id: delivery.driverId },
              data: { currentLat: latitude, currentLng: longitude, isOnline: true },
            }),
          ]
        : []),
    ]);

    notifyDeliveryChanged(
      delivery.id,
      delivery.order.restaurantId,
      delivery.order.id,
      { delivery: "location" },
    );

    return NextResponse.json({ ok: true, recorded: true });
  } catch (err) {
    console.error("[rider/ping] failed", err);
    // Never surface a hard error to a rider mid-route over a dropped ping.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
