import { NextResponse } from "next/server";

/**
 * POST /api/admin/logout
 * Clear the master admin session cookie.
 */
export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("master_admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
