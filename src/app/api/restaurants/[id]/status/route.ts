import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { hasResolvableSchedule } from "@/lib/operational-status";

async function assertAccess(req: NextRequest, restaurantId: string) {
  // Staff belonging to the restaurant can update status
  const staff = await getStaffSession(req);
  if (staff?.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const r = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!r;
}

// GET /api/restaurants/[id]/status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Degrade gracefully on transient pool/DB errors with a 503 (client retries).
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: {
        isOpen: true,
        deliveryEnabled: true,
        openingTime: true,
        closingTime: true,
        capability: { select: { deliveryEnabled: true } },
        _count: { select: { hours: true } },
      },
    });
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      isOpen: restaurant.isOpen,
      // Prefer the capability row; fall back to the legacy column during rollout.
      deliveryEnabled:
        restaurant.capability?.deliveryEnabled ?? restaurant.deliveryEnabled,
      // Two different facts, deliberately both exposed:
      //  · hoursConfigured  — has the owner actually set per-day hours? Drives the
      //                       "set your hours" prompt in settings.
      //  · canEnableDelivery — would PATCH accept it right now? Must mirror the
      //                       server gate exactly, or the UI offers a toggle that fails.
      hoursConfigured: restaurant._count.hours > 0,
      canEnableDelivery: hasResolvableSchedule(
        restaurant,
        restaurant._count.hours,
      ),
    });
  } catch (err) {
    console.error("[status] GET failed", err);
    return NextResponse.json(
      { error: "Could not load status. Please try again." },
      { status: 503 },
    );
  }
}

// PATCH /api/restaurants/[id]/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { isOpen?: unknown; deliveryEnabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.isOpen !== undefined) data.isOpen = Boolean(body.isOpen);

  const wantsDelivery = body.deliveryEnabled !== undefined;
  const deliveryEnabled = Boolean(body.deliveryEnabled);

  if (Object.keys(data).length === 0 && !wantsDelivery)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  // Delivery may not be switched on before a schedule exists. Enforced HERE and
  // not only in the settings UI — a UI-only gate is not a gate, and a customer
  // sent to a kitchen with no known hours is the exact failure this prevents.
  //
  // `hasResolvableSchedule` accepts valid legacy openingTime/closingTime as well
  // as per-day rows. That is deliberate: before the hours editor ships, no
  // restaurant has rows, and counting rows alone would break the existing
  // delivery toggle for every live restaurant.
  if (wantsDelivery && deliveryEnabled) {
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
    if (!hasResolvableSchedule(restaurant, restaurant._count.hours)) {
      return NextResponse.json(
        {
          error: "Set your opening days and hours before enabling delivery.",
          code: "HOURS_REQUIRED",
        },
        { status: 409 },
      );
    }
  }

  try {
    const restaurant = await db.$transaction(async (tx) => {
      if (wantsDelivery) {
        // Write both the capability row and the legacy column so nothing reading
        // the old field goes stale mid-rollout. The legacy column is retired in a
        // later destructive deploy.
        await tx.restaurantCapability.upsert({
          where: { restaurantId: id },
          create: { restaurantId: id, deliveryEnabled },
          update: { deliveryEnabled },
        });
        data.deliveryEnabled = deliveryEnabled;
      }

      return tx.restaurant.update({
        where: { id },
        data,
        select: {
          isOpen: true,
          deliveryEnabled: true,
          capability: { select: { deliveryEnabled: true } },
        },
      });
    });

    return NextResponse.json({
      isOpen: restaurant.isOpen,
      deliveryEnabled:
        restaurant.capability?.deliveryEnabled ?? restaurant.deliveryEnabled,
    });
  } catch (err) {
    // P2025 = record not found. A staff JWT carries a restaurantId that is only
    // checked for equality, so it can outlive the restaurant it refers to.
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[status] PATCH failed", err);
    return NextResponse.json(
      { error: "Could not update status. Please try again." },
      { status: 503 },
    );
  }
}
