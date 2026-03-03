import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";

// GET today's attendance record
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await db.staffAttendance.findFirst({
    where: {
      staffId: session.staffId,
      date: today,
    },
  });

  return NextResponse.json({ record });
}

// POST punch in / punch out
export async function POST(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body; // "PUNCH_IN" or "PUNCH_OUT"

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (action === "PUNCH_IN") {
    // Check if already punched in
    const existing = await db.staffAttendance.findFirst({
      where: { staffId: session.staffId, date: today },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already punched in today" },
        { status: 400 },
      );
    }

    const record = await db.staffAttendance.create({
      data: {
        staffId: session.staffId,
        date: today,
        checkIn: now,
        status: "PRESENT",
      },
    });

    return NextResponse.json({ record });
  }

  if (action === "PUNCH_OUT") {
    const record = await db.staffAttendance.findFirst({
      where: { staffId: session.staffId, date: today },
    });

    if (!record || record.checkOut) {
      return NextResponse.json({ error: "Cannot punch out" }, { status: 400 });
    }

    const updated = await db.staffAttendance.update({
      where: { id: record.id },
      data: { checkOut: now },
    });

    return NextResponse.json({ record: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
