import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export const GET = safeHandler(async (req) => {
  const session = await getStaffSession(req);
  if (!session) return unauthorized("Not authenticated");

  // Fetch live DB role + active status alongside restaurant details.
  // The JWT may be stale if the owner changed the staff member's role —
  // always use the DB as the source of truth.
  const [staffMember, restaurant] = await Promise.all([
    db.staffMember.findUnique({
      where: { id: session.staffId },
      select: { role: true, isActive: true },
    }),
    db.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { type: true, currency: true },
    }),
  ]);

  if (!staffMember?.isActive) return unauthorized("Account deactivated");

  return NextResponse.json({
    staffId: session.staffId,
    restaurantId: session.restaurantId,
    role: staffMember?.role ?? session.role, // live DB role, not JWT role
    userId: session.userId,
    name: session.name,
    restaurantType: restaurant?.type ?? "RESTAURANT",
    currency: restaurant?.currency ?? "NPR",
  });
});

// Logout — clear the cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "staff_session",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
