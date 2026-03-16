import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

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

  // Staff session check
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
    return NextResponse.json({ canEdit: !!member });
  }

  // Supabase user check
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
