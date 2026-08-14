import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { specialHoursSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

/**
 * Date-specific overrides — holidays, maintenance, a private event.
 *
 * These beat the weekly schedule but lose to `Restaurant.isOpen = false`.
 * A service-specific row beats a blanket one for the same date; that precedence
 * lives in `hours.ts` and is not re-implemented here.
 */

/** `YYYY-MM-DD` → the UTC-midnight Date that `@db.Date` round-trips cleanly. */
function toDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// POST /api/restaurants/[id]/hours/special — add or replace one override
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

  const parsed = specialHoursSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid override" },
      { status: 400 },
    );
  }

  const { date, serviceType, isClosed, openMin, closeMin, reason } = parsed.data;

  try {
    const record = await db.restaurantSpecialHours.upsert({
      where: {
        restaurantId_date_serviceType: {
          restaurantId: id,
          date: toDateOnly(date),
          serviceType,
        },
      },
      create: {
        restaurantId: id,
        date: toDateOnly(date),
        serviceType,
        isClosed,
        // A closed day carries no times — storing stale ones would let a later
        // "reopen" toggle silently resurrect the wrong window.
        openMin: isClosed ? null : openMin,
        closeMin: isClosed ? null : closeMin,
        reason: reason ?? null,
      },
      update: {
        isClosed,
        openMin: isClosed ? null : openMin,
        closeMin: isClosed ? null : closeMin,
        reason: reason ?? null,
      },
      select: {
        id: true,
        date: true,
        serviceType: true,
        isClosed: true,
        openMin: true,
        closeMin: true,
        reason: true,
      },
    });

    logAudit({
      action: "RESTAURANT_UPDATED",
      entity: "RestaurantSpecialHours",
      entityId: record.id,
      detail: `${isClosed ? "Closed" : "Special hours"} on ${date}${reason ? ` (${reason})` : ""}`,
      restaurantId: id,
      userId: access.kind === "owner" ? access.userId : undefined,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("[hours/special] POST failed", err);
    return NextResponse.json(
      { error: "Could not save the override. Please try again." },
      { status: 503 },
    );
  }
}

// DELETE /api/restaurants/[id]/hours/special?overrideId=…
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const overrideId = req.nextUrl.searchParams.get("overrideId");
  if (!overrideId) {
    return NextResponse.json({ error: "overrideId is required" }, { status: 400 });
  }

  try {
    // deleteMany with the tenant scope in the filter: an id alone would let one
    // restaurant delete another's override. There is no RLS backstop.
    const { count } = await db.restaurantSpecialHours.deleteMany({
      where: { id: overrideId, restaurantId: id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[hours/special] DELETE failed", err);
    return NextResponse.json(
      { error: "Could not remove the override. Please try again." },
      { status: 503 },
    );
  }
}
