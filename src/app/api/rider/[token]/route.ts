import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transitionDeliveryStatus } from "@/lib/delivery/state-machine";
import { notifyDeliveryChanged } from "@/lib/realtime";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";
import { z } from "zod";

/**
 * The rider's account-less view of ONE delivery.
 *
 * `riderToken` is the whole authorisation model, deliberately: riders are casual
 * staff who will not install an app or remember a password, and the same pattern
 * already serves order tracking and hardware listings. It follows that the token
 * must be treated as a bearer credential:
 *
 *   · it is scoped to a single delivery and grants nothing else
 *   · the customer's phone and address are only returned once a rider has
 *     actually been assigned — a leaked link to an unassigned order exposes no
 *     personal data
 *   · every state change re-derives the driver id from the token server-side and
 *     the state machine re-checks it against the assignment
 *   · it stops working the moment the delivery reaches a terminal state
 */

const actionSchema = z.object({
  to: z.enum(["PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED"]),
  reason: z.string().trim().max(300).optional(),
});

async function loadByToken(token: string) {
  return db.delivery.findUnique({
    where: { riderToken: token },
    select: {
      id: true,
      status: true,
      driverId: true,
      dropoffLat: true,
      dropoffLng: true,
      pickupLat: true,
      pickupLng: true,
      distanceKm: true,
      estimatedMins: true,
      finalFee: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          total: true,
          restaurantId: true,
          deliveryAddress: true,
          deliveryPhone: true,
          deliveryNote: true,
          guestName: true,
          payment: { select: { method: true, status: true } },
          items: { select: { id: true, name: true, quantity: true } },
          restaurant: {
            select: { name: true, address: true, phone: true, currency: true },
          },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });
}

// GET /api/rider/[token]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const d = await loadByToken(token);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Withhold customer PII until this delivery actually has a rider. A link
    // that leaks before assignment then reveals nothing personal.
    const assigned = d.driverId != null;

    return NextResponse.json(
      {
        id: d.id,
        status: d.status,
        assigned,
        driverName: d.driver?.name ?? null,
        orderNo: d.order.orderNo,
        total: d.order.total,
        currency: d.order.restaurant.currency,
        paymentMethod: d.order.payment?.method ?? null,
        paymentStatus: d.order.payment?.status ?? null,
        // Cash still to collect is the single most important thing on this
        // screen, so it is computed here rather than inferred in the UI.
        collectCash:
          d.order.payment?.method === "CASH" &&
          d.order.payment.status !== "COMPLETED"
            ? d.order.total
            : 0,
        items: d.order.items,
        pickup: {
          name: d.order.restaurant.name,
          address: d.order.restaurant.address,
          phone: d.order.restaurant.phone,
          lat: d.pickupLat,
          lng: d.pickupLng,
        },
        dropoff: assigned
          ? {
              address: d.order.deliveryAddress,
              phone: d.order.deliveryPhone,
              note: d.order.deliveryNote,
              name: d.order.guestName,
              lat: d.dropoffLat,
              lng: d.dropoffLng,
            }
          : null,
        distanceKm: d.distanceKm,
        estimatedMins: d.estimatedMins,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[rider] GET failed", err);
    return NextResponse.json({ error: "Could not load delivery." }, { status: 503 });
  }
}

// PATCH /api/rider/[token] — advance the delivery
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`rider-action:${ip}`, 60_000, 30);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds || 60) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid action" },
      { status: 400 },
    );
  }

  try {
    const d = await loadByToken(token);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await transitionDeliveryStatus({
      deliveryId: d.id,
      to: parsed.data.to,
      actor: "DRIVER",
      restaurantId: d.order.restaurantId,
      // Taken from the delivery row, never from the request — the token proves
      // scope, and the machine re-checks it matches the assigned rider.
      driverId: d.driverId,
      reason: parsed.data.reason ?? null,
    });

    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    notifyDeliveryChanged(d.id, d.order.restaurantId, d.order.id, {
      delivery: result.to,
    });

    return NextResponse.json({ ok: true, status: result.to });
  } catch (err) {
    console.error("[rider] PATCH failed", err);
    return NextResponse.json({ error: "Could not update." }, { status: 503 });
  }
}
