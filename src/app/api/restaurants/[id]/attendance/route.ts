import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { requireStaffForRestaurant } from "@/lib/staff-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Allow MANAGER / SUPER_ADMIN staff in addition to restaurant owners
  const staffSession = await requireStaffForRestaurant(req, id).catch(() => null);
  const isAuthorizedStaff =
    staffSession && ["MANAGER", "SUPER_ADMIN"].includes(staffSession.role);

  if (!isAuthorizedStaff) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!restaurant || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const logs = await db.staffAttendance.findMany({
    where: {
      staff: {
        restaurantId: id,
      },
    },
    include: {
      staff: {
        omit: { pin: true },
        include: {
          user: {
            select: { name: true, imageUrl: true },
          },
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 100,
  });

  return NextResponse.json(logs);
}
