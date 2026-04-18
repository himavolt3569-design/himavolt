import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { STAFF_MANAGER_ROLES } from "@/lib/staff-roles";
import type { StaffRole } from "@/generated/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!restaurant) return NextResponse.json({ canEdit: false });

  const staffSession = await getStaffSession(req);
  if (staffSession) {
    const member = await db.staffMember.findFirst({
      where: {
        id: staffSession.staffId,
        restaurantId: restaurant.id,
        isActive: true,
        role: { in: STAFF_MANAGER_ROLES as unknown as StaffRole[] },
      },
    });
    return NextResponse.json({ canEdit: !!member });
  }

  try {
    const user = await getOrCreateUser();
    if (user && (user.role === "ADMIN" || restaurant.ownerId === user.id)) {
      return NextResponse.json({ canEdit: true });
    }
  } catch {
    // not signed in
  }

  return NextResponse.json({ canEdit: false });
}
