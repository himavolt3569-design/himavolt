import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * GET /api/admin/verify
 * Check if the master admin session cookie is valid.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get("master_admin_session")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "MASTER_ADMIN") {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
