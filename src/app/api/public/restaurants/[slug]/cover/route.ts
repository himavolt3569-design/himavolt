import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allow owner OR staff (manager / super_admin) of this restaurant
  const staffSession = await getStaffSession(req);
  if (staffSession) {
    const member = await db.staffMember.findFirst({
      where: {
        id: staffSession.staffId,
        restaurantId: restaurant.id,
        isActive: true,
        role: { in: ["SUPER_ADMIN", "MANAGER"] },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const user = await getOrCreateUser();
    if (!user || (user.role !== "ADMIN" && restaurant.ownerId !== user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { coverUrl } = await req.json();
  if (!coverUrl || typeof coverUrl !== "string") {
    return NextResponse.json({ error: "coverUrl required" }, { status: 400 });
  }

  await db.restaurant.update({ where: { id: restaurant.id }, data: { coverUrl } });
  return NextResponse.json({ ok: true });
}
