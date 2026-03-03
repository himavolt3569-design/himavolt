import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";

// PATCH change PIN
export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { currentPin, newPin } = body;

  if (!newPin || newPin.length !== 4) {
    return NextResponse.json(
      { error: "New PIN must be 4 digits" },
      { status: 400 },
    );
  }

  const staff = await db.staffMember.findUnique({
    where: { id: session.staffId },
  });

  if (!staff || staff.pin !== currentPin) {
    return NextResponse.json(
      { error: "Current PIN is incorrect" },
      { status: 400 },
    );
  }

  await db.staffMember.update({
    where: { id: session.staffId },
    data: { pin: newPin },
  });

  return NextResponse.json({ success: true });
}
