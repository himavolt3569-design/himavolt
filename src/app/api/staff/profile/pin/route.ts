import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";
import { hashPin, verifyPin } from "@/lib/pin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function PATCH(req: NextRequest) {
  const limit = await rateLimit(clientKey(req, "pin-change"), 15 * 60_000, 5);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const session = await getStaffSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { currentPin, newPin } = body;

  if (typeof newPin !== "string" || !/^\d{4}$/.test(newPin)) {
    return NextResponse.json(
      { error: "New PIN must be exactly 4 digits" },
      { status: 400 },
    );
  }
  if (typeof currentPin !== "string") {
    return NextResponse.json(
      { error: "Current PIN is required" },
      { status: 400 },
    );
  }

  const staff = await db.staffMember.findUnique({
    where: { id: session.staffId },
  });

  if (!staff || !(await verifyPin(currentPin, staff.pin))) {
    return NextResponse.json(
      { error: "Current PIN is incorrect" },
      { status: 400 },
    );
  }

  const hashedNewPin = await hashPin(newPin);
  await db.staffMember.update({
    where: { id: session.staffId },
    data: { pin: hashedNewPin },
  });

  return NextResponse.json({ success: true });
}
