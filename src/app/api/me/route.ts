import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ role: null });
  return NextResponse.json({ role: user.role });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: string };

  // Only CUSTOMER or OWNER can be self-assigned — never ADMIN
  if (role !== "CUSTOMER" && role !== "OWNER") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only allow upgrading from CUSTOMER; OWNER and ADMIN cannot be changed here
  if (user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Role cannot be changed" }, { status: 403 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { role },
  });

  return NextResponse.json({ role: updated.role });
}
