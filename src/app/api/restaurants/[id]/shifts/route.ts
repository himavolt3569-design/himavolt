import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { createShiftSchema } from "@/lib/validations";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  // Owner auth
  const user = await getAuthUser();
  if (user) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId: user.id },
      select: { id: true },
    });
    if (restaurant) return { authorized: true, isOwner: true };
  }

  // Manager/SuperAdmin staff auth
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["MANAGER", "SUPER_ADMIN"].includes(staff.role)) {
    return { authorized: true, isOwner: false };
  }

  return null;
}

// GET /api/restaurants/[id]/shifts — List shifts (optionally filtered by date)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date"); // YYYY-MM-DD

  const where: Record<string, unknown> = { restaurantId: id };
  if (dateParam) {
    const dayStart = new Date(dateParam + "T00:00:00.000Z");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.date = { gte: dayStart, lt: dayEnd };
  } else {
    // Default: last 90 days
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    where.date = { gte: cutoff };
  }

  const shifts = await db.shift.findMany({
    where,
    include: {
      staff: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
    take: 200,
  });

  return NextResponse.json(shifts);
}

// POST /api/restaurants/[id]/shifts — Create a shift
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await verifyAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createShiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { staffId, date, startTime, endTime, label } = parsed.data;

  // Confirm staff belongs to this restaurant
  const staffMember = await db.staffMember.findFirst({
    where: { id: staffId, restaurantId: id },
    select: { id: true, staffType: true },
  });
  if (!staffMember) {
    return NextResponse.json(
      { error: "Staff member not found in this restaurant" },
      { status: 404 },
    );
  }

  // Full-time staff cannot have shift windows
  if (staffMember.staffType === "FULL_TIME") {
    return NextResponse.json(
      { error: "Full-time staff cannot be assigned shift windows" },
      { status: 400 },
    );
  }

  const shiftDate = new Date(date + "T00:00:00.000Z");

  const shift = await db.shift.create({
    data: {
      staffId,
      restaurantId: id,
      date: shiftDate,
      startTime,
      endTime,
      label: label ?? null,
    },
    include: {
      staff: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(shift, { status: 201 });
}
