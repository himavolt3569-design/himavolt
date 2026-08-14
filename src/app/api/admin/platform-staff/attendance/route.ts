import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/api-helpers";
import { z } from "zod";

const attendanceSchema = z.object({
  platformStaffId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  status: z.enum(["PRESENT", "LATE", "LEAVE", "ABSENT"]),
  note: z.string().optional(),
});

/**
 * GET /api/admin/platform-staff/attendance
 * List attendance records for a specific date or staff member.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdminPermission(req, "attendance.manage");
  if (!admin) return unauthorized("Permission denied");

  const url = req.nextUrl;
  const dateStr = url.searchParams.get("date");
  const platformStaffId = url.searchParams.get("platformStaffId");

  const where: Record<string, unknown> = {};

  if (dateStr) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      where.date = date;
    }
  }

  if (platformStaffId) {
    where.platformStaffId = platformStaffId;
  }

  const attendances = await db.platformStaffAttendance.findMany({
    where,
    include: {
      platformStaff: { select: { id: true, name: true, email: true } }
    },
    orderBy: { date: "desc" }
  });

  return NextResponse.json(attendances);
}

/**
 * POST /api/admin/platform-staff/attendance
 * Master Admin creates or updates an attendance record (e.g. to grant LEAVE).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminPermission(req, "attendance.manage");
  if (!admin) return unauthorized("Permission denied");

  const parsed = attendanceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { platformStaffId, date: dateStr, status, note } = parsed.data;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const record = await db.platformStaffAttendance.upsert({
    where: {
      platformStaffId_date: {
        platformStaffId,
        date
      }
    },
    update: {
      status,
      note
    },
    create: {
      platformStaffId,
      date,
      status,
      note,
      checkIn: new Date() // Default check-in time, even for leave, since it's required
    }
  });

  return NextResponse.json(record);
}
