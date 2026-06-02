import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const user = await getAuthUser();
  if (user) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId: user.id },
      select: { id: true },
    });
    if (restaurant) return true;
  }
  const staff = await requireStaffForRestaurant(req, restaurantId);
  return !!staff && ["MANAGER", "SUPER_ADMIN"].includes(staff.role);
}

interface ShiftRow {
  id: string;
  label: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  actualEndTime: Date | null;
  staffId: string;
  staff: {
    id: string;
    role: string;
    staffType: string;
    user: { name: string; email: string };
  };
}

interface StaffRow {
  id: string;
  role: string;
  staffType: string;
  isActive: boolean;
  user: { name: string; email: string };
}

function startOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function combine(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const r = new Date(date);
  r.setUTCHours(
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0,
  );
  return r;
}

// GET /api/restaurants/[id]/shifts/now
// Returns live shift status: who's currently on, who starts next, and
// which shift-based staff have no shift today.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await verifyAccess(req, id);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfUTCDay(now);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [shifts, staff]: [ShiftRow[], StaffRow[]] = await Promise.all([
    db.shift.findMany({
      where: {
        restaurantId: id,
        date: { in: [yesterday, today, tomorrow] },
      },
      include: {
        staff: {
          omit: { pin: true },
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    db.staffMember.findMany({
      where: { restaurantId: id, isActive: true },
      omit: { pin: true },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  type ResolvedShift = {
    id: string;
    label: string | null;
    date: string;
    startTime: string;
    endTime: string;
    actualEndTime: string | null;
    startsAt: string;
    endsAt: string;
    effectiveEndsAt: string;
    staff: {
      id: string;
      role: string;
      staffType: string;
      name: string;
      email: string;
    };
  };

  const resolved: ResolvedShift[] = shifts.map((s) => {
    const start = combine(s.date, s.startTime);
    let end = combine(s.date, s.endTime);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    const effectiveEnd =
      s.actualEndTime && s.actualEndTime.getTime() < end.getTime()
        ? s.actualEndTime
        : end;
    return {
      id: s.id,
      label: s.label,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      actualEndTime: s.actualEndTime?.toISOString() ?? null,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      effectiveEndsAt: effectiveEnd.toISOString(),
      staff: {
        id: s.staff.id,
        role: s.staff.role,
        staffType: s.staff.staffType,
        name: s.staff.user.name,
        email: s.staff.user.email,
      },
    };
  });

  const onShift = resolved.filter((s) => {
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.effectiveEndsAt).getTime();
    return now.getTime() >= start && now.getTime() <= end;
  });

  const upcoming = resolved
    .filter((s) => new Date(s.startsAt).getTime() > now.getTime())
    .slice(0, 6);

  // FULL_TIME staff + management roles — always allowed, no shift needed.
  const alwaysOn = staff
    .filter(
      (s) =>
        s.staffType === "FULL_TIME" ||
        s.role === "SUPER_ADMIN" ||
        s.role === "MANAGER",
    )
    .map((s) => ({
      id: s.id,
      role: s.role,
      staffType: s.staffType,
      name: s.user.name,
      email: s.user.email,
    }));

  // SHIFT_BASED staff who don't currently have a shift in the day window.
  const onShiftStaffIds = new Set(onShift.map((s) => s.staff.id));
  const shiftBasedStaffIds = new Set(
    resolved.map((s) => s.staff.id).filter((sid) => {
      const member = staff.find((x) => x.id === sid);
      return member?.staffType === "SHIFT_BASED";
    }),
  );

  const offToday = staff
    .filter(
      (s) =>
        s.staffType === "SHIFT_BASED" &&
        s.role !== "SUPER_ADMIN" &&
        s.role !== "MANAGER" &&
        !onShiftStaffIds.has(s.id) &&
        !shiftBasedStaffIds.has(s.id),
    )
    .map((s) => ({
      id: s.id,
      role: s.role,
      staffType: s.staffType,
      name: s.user.name,
      email: s.user.email,
    }));

  return NextResponse.json({
    now: now.toISOString(),
    onShift,
    upcoming,
    alwaysOn,
    offToday,
  });
}
