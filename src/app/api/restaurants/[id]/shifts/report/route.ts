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
    if (restaurant) return { authorized: true };
  }

  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["MANAGER", "SUPER_ADMIN"].includes(staff.role)) {
    return { authorized: true };
  }

  return null;
}

/** Parse "HH:mm" into total minutes from midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Build a Date from a base Date (date-only) + "HH:mm" string (UTC) */
function buildDatetime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

/** Duration in minutes between checkIn and checkOut */
function durationMinutes(checkIn: Date, checkOut: Date | null): number | null {
  if (!checkOut) return null;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
}

// GET /api/restaurants/[id]/shifts/report?date=YYYY-MM-DD
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
  const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const rangeStart = new Date(dateParam + "T00:00:00.000Z");
  const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);

  // Fetch all data in parallel
  const [shifts, fullTimeStaff, orders, attendanceLogs] = await Promise.all([
    db.shift.findMany({
      where: { restaurantId: id, date: { gte: rangeStart, lt: rangeEnd } },
      include: {
        staff: {
          omit: { pin: true },
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    db.staffMember.findMany({
      where: { restaurantId: id, staffType: "FULL_TIME", isActive: true },
      omit: { pin: true },
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    db.order.findMany({
      where: {
        restaurantId: id,
        createdAt: { gte: rangeStart, lt: rangeEnd },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: {
        id: true,
        orderNo: true,
        tableNo: true,
        roomNo: true,
        guestName: true,
        total: true,
        subtotal: true,
        createdAt: true,
        processedByStaffId: true,
        payment: { select: { method: true, status: true, amount: true } },
        bill: { select: { total: true } },
        items: { select: { name: true, quantity: true, price: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.staffAttendance.findMany({
      where: {
        staff: { restaurantId: id },
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: {
        staffId: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    }),
  ]);

  // Build attendance lookup map
  const attendanceByStaffId = new Map(
    attendanceLogs.map((a) => [a.staffId, a]),
  );

  const assignedOrderIds = new Set<string>();

  // ── Full-time staff: orders they explicitly processed ───────────────
  const fullTimeResults = fullTimeStaff.map((ftStaff) => {
    const staffOrders = orders.filter(
      (o) => o.processedByStaffId === ftStaff.id && !assignedOrderIds.has(o.id),
    );
    staffOrders.forEach((o) => assignedOrderIds.add(o.id));
    const revenue = staffOrders.reduce((sum, o) => {
      if (o.payment?.status === "COMPLETED") {
        return sum + (o.bill?.total ?? o.total);
      }
      return sum;
    }, 0);

    const att = attendanceByStaffId.get(ftStaff.id) ?? null;

    return {
      staff: {
        id: ftStaff.id,
        staffType: ftStaff.staffType,
        user: {
          name: ftStaff.user.name,
          email: ftStaff.user.email,
          phone: ftStaff.user.phone ?? null,
        },
      },
      attendance: att
        ? {
            checkIn: att.checkIn.toISOString(),
            checkOut: att.checkOut?.toISOString() ?? null,
            status: att.status,
            durationMinutes: durationMinutes(att.checkIn, att.checkOut),
          }
        : null,
      orderCount: staffOrders.length,
      revenue: Math.round(revenue * 100) / 100,
      orders: staffOrders,
    };
  });

  // ── Shift-based staff: temporal attribution ──────────────────────────
  const shiftResults = shifts.map((shift) => {
    const shiftStart = buildDatetime(shift.date, shift.startTime);

    // Effective end: actualEndTime (early clock-out) or parsed endTime
    let shiftEnd: Date;
    if (shift.actualEndTime) {
      shiftEnd = shift.actualEndTime;
    } else {
      shiftEnd = buildDatetime(shift.date, shift.endTime);
      // Handle overnight shift (endTime < startTime)
      if (toMinutes(shift.endTime) <= toMinutes(shift.startTime)) {
        shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const shiftOrders = orders.filter(
      (o) =>
        o.createdAt >= shiftStart &&
        o.createdAt < shiftEnd &&
        !assignedOrderIds.has(o.id),
    );
    shiftOrders.forEach((o) => assignedOrderIds.add(o.id));

    const revenue = shiftOrders.reduce((sum, o) => {
      if (o.payment?.status === "COMPLETED") {
        return sum + (o.bill?.total ?? o.total);
      }
      return sum;
    }, 0);

    const att = attendanceByStaffId.get(shift.staff.id) ?? null;

    return {
      shift: {
        id: shift.id,
        label: shift.label,
        startTime: shift.startTime,
        endTime: shift.endTime,
        actualEndTime: shift.actualEndTime?.toISOString() ?? null,
      },
      staff: {
        id: shift.staff.id,
        staffType: shift.staff.staffType,
        user: {
          name: shift.staff.user.name,
          email: shift.staff.user.email,
          phone: shift.staff.user.phone ?? null,
        },
      },
      attendance: att
        ? {
            checkIn: att.checkIn.toISOString(),
            checkOut: att.checkOut?.toISOString() ?? null,
            status: att.status,
            durationMinutes: durationMinutes(att.checkIn, att.checkOut),
          }
        : null,
      orderCount: shiftOrders.length,
      revenue: Math.round(revenue * 100) / 100,
      orders: shiftOrders,
    };
  });

  // ── Unassigned: orders not matched to any shift or full-time staff ──
  const unassignedOrders = orders.filter((o) => !assignedOrderIds.has(o.id));
  const unassignedRevenue = unassignedOrders.reduce((sum, o) => {
    if (o.payment?.status === "COMPLETED") {
      return sum + (o.bill?.total ?? o.total);
    }
    return sum;
  }, 0);

  const totalRevenue =
    fullTimeResults.reduce((s, r) => s + r.revenue, 0) +
    shiftResults.reduce((s, r) => s + r.revenue, 0) +
    Math.round(unassignedRevenue * 100) / 100;

  return NextResponse.json({
    date: dateParam,
    fullTimeStaff: fullTimeResults,
    shifts: shiftResults,
    unassigned: {
      orderCount: unassignedOrders.length,
      revenue: Math.round(unassignedRevenue * 100) / 100,
      orders: unassignedOrders,
    },
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: orders.length,
  });
}
