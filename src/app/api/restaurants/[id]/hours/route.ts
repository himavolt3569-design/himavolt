import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { setHoursSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { DEFAULT_TIMEZONE } from "@/lib/operational-status";

/**
 * Weekly operating hours, per service type.
 *
 * `PUT` replaces the WHOLE weekly schedule rather than patching individual days.
 * The editor always holds the complete state, and a full replace makes "close
 * Tuesdays" and "stop delivering at 21:30" a single atomic write — no partial
 * schedule can ever be observed by a customer mid-save.
 */

// GET /api/restaurants/[id]/hours
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [restaurant, hours, specialHours] = await Promise.all([
      db.restaurant.findUnique({
        where: { id },
        select: { timezone: true, openingTime: true, closingTime: true },
      }),
      db.restaurantHours.findMany({
        where: { restaurantId: id },
        orderBy: [{ serviceType: "asc" }, { dayOfWeek: "asc" }],
        select: {
          serviceType: true,
          dayOfWeek: true,
          isClosed: true,
          openMin: true,
          closeMin: true,
        },
      }),
      db.restaurantSpecialHours.findMany({
        where: {
          restaurantId: id,
          // Past overrides are noise in an editor; keep the list to what still matters.
          date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        },
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          serviceType: true,
          isClosed: true,
          openMin: true,
          closeMin: true,
          reason: true,
        },
      }),
    ]);

    if (!restaurant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      timezone: restaurant.timezone || DEFAULT_TIMEZONE,
      hours,
      specialHours,
      // Surfaced so the editor can pre-fill from the old single schedule the
      // first time an owner opens it, instead of showing seven blank rows.
      legacy: {
        openingTime: restaurant.openingTime,
        closingTime: restaurant.closingTime,
      },
    });
  } catch (err) {
    console.error("[hours] GET failed", err);
    return NextResponse.json(
      { error: "Could not load hours. Please try again." },
      { status: 503 },
    );
  }
}

// PUT /api/restaurants/[id]/hours — replaces the entire weekly schedule
export async function PUT(
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

  const parsed = setHoursSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid hours" },
      { status: 400 },
    );
  }

  const { hours } = parsed.data;

  // Reject duplicates before touching the database — the unique constraint would
  // catch it, but a 500 from a constraint violation is a worse answer than this.
  const seen = new Set<string>();
  for (const h of hours) {
    const key = `${h.serviceType}:${h.dayOfWeek}`;
    if (seen.has(key)) {
      return NextResponse.json(
        { error: `Duplicate entry for ${h.serviceType} day ${h.dayOfWeek}` },
        { status: 400 },
      );
    }
    seen.add(key);
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.restaurantHours.deleteMany({ where: { restaurantId: id } });
      if (hours.length > 0) {
        await tx.restaurantHours.createMany({
          data: hours.map((h) => ({ ...h, restaurantId: id })),
        });
      }
      // Keep the legacy columns roughly in step so anything still reading them
      // (the public restaurant list, older clients) doesn't show stale times.
      const dineInSunday = hours.find(
        (h) => h.serviceType === "DINE_IN" && h.dayOfWeek === 0 && !h.isClosed,
      );
      if (dineInSunday) {
        const fmt = (m: number) => {
          const wrapped = m % 1440;
          return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
        };
        await tx.restaurant.update({
          where: { id },
          data: {
            openingTime: fmt(dineInSunday.openMin),
            closingTime: fmt(dineInSunday.closeMin),
          },
        });
      }
    });

    logAudit({
      action: "RESTAURANT_UPDATED",
      entity: "RestaurantHours",
      entityId: id,
      detail: `Operating hours updated (${hours.length} rows)`,
      restaurantId: id,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    return NextResponse.json({ ok: true, count: hours.length });
  } catch (err) {
    console.error("[hours] PUT failed", err);
    return NextResponse.json(
      { error: "Could not save hours. Please try again." },
      { status: 503 },
    );
  }
}
