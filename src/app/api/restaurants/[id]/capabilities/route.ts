import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { updateCapabilitySchema } from "@/lib/validations";
import { hasResolvableSchedule } from "@/lib/operational-status";
import { logAudit } from "@/lib/audit";

/**
 * What this restaurant can do for a customer — dine-in, pickup, delivery, COD.
 *
 * Never derived from `Restaurant.type`: a Cafe, Bar, Hotel or Bakery may all
 * deliver. Type describes the business; capability describes what it does.
 */

const DEFAULTS = {
  dineInEnabled: true,
  pickupEnabled: false,
  deliveryEnabled: false,
  codEnabled: false,
  codMaxAmount: 2000,
  liveTrackingEnabled: false,
  deliveryRadiusKm: 5,
  deliveryPrepMins: 30,
  mergeBillingOrders: false,
  autoAcceptOrders: false,
};

const SELECT = {
  dineInEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  codEnabled: true,
  codMaxAmount: true,
  liveTrackingEnabled: true,
  deliveryRadiusKm: true,
  deliveryPrepMins: true,
  mergeBillingOrders: true,
  autoAcceptOrders: true,
} as const;

// GET /api/restaurants/[id]/capabilities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: {
        deliveryEnabled: true,
        openingTime: true,
        closingTime: true,
        capability: { select: SELECT },
        _count: { select: { hours: true } },
      },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      // No row yet (pre-backfill): synthesise defaults and carry the legacy
      // delivery flag across, so the settings screen shows the truth.
      capability: restaurant.capability ?? {
        ...DEFAULTS,
        deliveryEnabled: restaurant.deliveryEnabled,
      },
      hoursConfigured: restaurant._count.hours > 0,
      canEnableDelivery: hasResolvableSchedule(
        restaurant,
        restaurant._count.hours,
      ),
    });
  } catch (err) {
    console.error("[capabilities] GET failed", err);
    return NextResponse.json(
      { error: "Could not load settings. Please try again." },
      { status: 503 },
    );
  }
}

// PATCH /api/restaurants/[id]/capabilities
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateCapabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
      { status: 400 },
    );
  }
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: {
        openingTime: true,
        closingTime: true,
        _count: { select: { hours: true } },
      },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Same gate as PATCH /status, enforced on this path too — otherwise the
    // settings screen becomes a way around it.
    if (
      patch.deliveryEnabled === true &&
      !hasResolvableSchedule(restaurant, restaurant._count.hours)
    ) {
      return NextResponse.json(
        {
          error: "Set your opening days and hours before enabling delivery.",
          code: "HOURS_REQUIRED",
        },
        { status: 409 },
      );
    }

    const capability = await db.$transaction(async (tx) => {
      const row = await tx.restaurantCapability.upsert({
        where: { restaurantId: id },
        create: { restaurantId: id, ...DEFAULTS, ...patch },
        update: patch,
        select: SELECT,
      });
      // Mirror into the legacy column while anything still reads it.
      if (patch.deliveryEnabled !== undefined) {
        await tx.restaurant.update({
          where: { id },
          data: { deliveryEnabled: patch.deliveryEnabled },
        });
      }
      return row;
    });

    logAudit({
      action: "RESTAURANT_UPDATED",
      entity: "RestaurantCapability",
      entityId: id,
      detail: `Capabilities updated: ${Object.keys(patch).join(", ")}`,
      metadata: patch,
      restaurantId: id,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    return NextResponse.json({ capability });
  } catch (err) {
    console.error("[capabilities] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not save settings. Please try again." },
      { status: 503 },
    );
  }
}
