import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { nepalMobilePhoneSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

/**
 * A restaurant's own delivery riders.
 *
 * Every query is scoped by `restaurantId`. The column was added specifically to
 * close this: without it the `delivery_drivers` table is global, and one
 * restaurant can read — and assign — another's riders.
 */

const createRiderSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  phone: nepalMobilePhoneSchema,
  vehicleType: z.enum(["BIKE", "SCOOTER", "CAR", "BICYCLE"]).default("BIKE"),
  vehicleNo: z.string().trim().max(30).optional().nullable(),
});

const SELECT = {
  id: true,
  name: true,
  phone: true,
  vehicleType: true,
  vehicleNo: true,
  isActive: true,
  isOnline: true,
  totalTrips: true,
  rating: true,
} as const;

// GET /api/restaurants/[id]/riders
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const riders = await db.deliveryDriver.findMany({
      where: { restaurantId: id },
      orderBy: [{ isOnline: "desc" }, { name: "asc" }],
      select: SELECT,
    });
    return NextResponse.json({ riders });
  } catch (err) {
    console.error("[riders] GET failed", err);
    return NextResponse.json(
      { error: "Could not load riders." },
      { status: 503 },
    );
  }
}

// POST /api/restaurants/[id]/riders
export async function POST(
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

  const parsed = createRiderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rider" },
      { status: 400 },
    );
  }

  try {
    const rider = await db.deliveryDriver.create({
      data: { ...parsed.data, restaurantId: id },
      select: SELECT,
    });

    logAudit({
      action: "STAFF_ADDED",
      entity: "DeliveryDriver",
      entityId: rider.id,
      detail: `Rider ${rider.name} added`,
      restaurantId: id,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    return NextResponse.json(rider, { status: 201 });
  } catch (err) {
    // `phone` is globally unique on the table, so the same person cannot be
    // registered twice — including at a different restaurant.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "A rider with that phone number already exists." },
        { status: 409 },
      );
    }
    console.error("[riders] POST failed", err);
    return NextResponse.json({ error: "Could not add rider." }, { status: 503 });
  }
}

// PATCH /api/restaurants/[id]/riders?riderId=…  — toggle active/online
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const riderId = req.nextUrl.searchParams.get("riderId");
  if (!riderId) {
    return NextResponse.json({ error: "riderId is required" }, { status: 400 });
  }

  let body: { isActive?: unknown; isOnline?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.isOnline !== undefined) data.isOnline = Boolean(body.isOnline);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const { count } = await db.deliveryDriver.updateMany({
      where: { id: riderId, restaurantId: id },
      data,
    });
    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const rider = await db.deliveryDriver.findFirst({
      where: { id: riderId, restaurantId: id },
      select: SELECT,
    });
    return NextResponse.json(rider);
  } catch (err) {
    console.error("[riders] PATCH failed", err);
    return NextResponse.json({ error: "Could not update rider." }, { status: 503 });
  }
}
