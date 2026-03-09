import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";

export const GET = safeHandler(async (req) => {
  const session = await getStaffSession(req);
  if (!session) return unauthorized("Not authenticated");

  return NextResponse.json({
    staffId: session.staffId,
    restaurantId: session.restaurantId,
    role: session.role,
    userId: session.userId,
    name: session.name,
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
