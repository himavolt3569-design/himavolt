import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRestaurantAccess } from "@/lib/access-control";

type Params = { params: Promise<{ id: string; resId: string }> };

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "REJECTED",
  "NO_SHOW",
  "COMPLETED",
];

// PATCH /api/restaurants/[id]/reservations/[resId] — update status / assign table
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, resId } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.reservation.findFirst({
    where: { id: resId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status, tableNumber, specialRequests, partySize } = body;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const updated = await db.reservation.update({
    where: { id: resId },
    data: {
      ...(status && { status }),
      ...(tableNumber !== undefined && { tableNumber }),
      ...(specialRequests !== undefined && { specialRequests }),
      ...(partySize !== undefined && { partySize }),
      ...(status === "CONFIRMED" && access.kind === "staff"
        ? { confirmedBy: access.staff.staffId }
        : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/restaurants/[id]/reservations/[resId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, resId } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.reservation.findFirst({
    where: { id: resId, restaurantId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.reservation.delete({ where: { id: resId } });
  return NextResponse.json({ success: true });
}
