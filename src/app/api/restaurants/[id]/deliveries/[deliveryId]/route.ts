import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { transitionDeliveryStatus } from "@/lib/delivery/state-machine";
import { notifyDeliveryChanged } from "@/lib/realtime";
import { z } from "zod";

/**
 * Advance one delivery from the dashboard.
 *
 * The route never writes `status` itself — it calls the state machine, which is
 * the only writer and which validates both the edge and the actor. A route that
 * could set the column directly would make the machine advisory.
 */

const actionSchema = z.object({
  to: z.enum([
    "READY_FOR_PICKUP",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
    "FAILED",
    "RETURNED",
  ]),
  driverId: z.string().min(1).optional(),
  reason: z.string().trim().max(300).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> },
) {
  const { id, deliveryId } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const { to, driverId, reason } = parsed.data;

  try {
    const result = await transitionDeliveryStatus({
      deliveryId,
      to,
      // Staff acting from the dashboard are RESTAURANT, never DRIVER. Driver
      // authority comes only from a rider token proving scope to one delivery.
      actor: "RESTAURANT",
      restaurantId: id,
      assignDriverId: to === "ASSIGNED" ? (driverId ?? null) : null,
      reason: reason ?? null,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    if (!result.ok) {
      // A refused transition is a client error, not a server fault — the board
      // is showing a state that has already moved on.
      const status = result.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    const delivery = await db.delivery.findFirst({
      where: { id: deliveryId, order: { restaurantId: id } },
      select: { orderId: true },
    });
    if (delivery) {
      notifyDeliveryChanged(deliveryId, id, delivery.orderId, {
        delivery: result.to,
      });
    }

    return NextResponse.json({ ok: true, from: result.from, to: result.to });
  } catch (err) {
    console.error("[deliveries] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not update the delivery. Please try again." },
      { status: 503 },
    );
  }
}
