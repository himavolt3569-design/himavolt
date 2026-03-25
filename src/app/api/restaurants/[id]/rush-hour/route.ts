import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

async function assertAccess(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff?.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const r = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!r;
}

// GET /api/restaurants/[id]/rush-hour
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await db.rushHourConfig.findUnique({
    where: { restaurantId: id },
    include: { slots: { orderBy: { startTime: "asc" } } },
  });
  return NextResponse.json(config ?? { isEnabled: false, surgeEnabled: false, surgePercent: 10, slots: [] });
}

// PATCH /api/restaurants/[id]/rush-hour  (create-or-update the config)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { isEnabled, surgeEnabled, surgePercent } = body;

  const config = await db.rushHourConfig.upsert({
    where: { restaurantId: id },
    create: {
      restaurantId: id,
      isEnabled: isEnabled ?? false,
      surgeEnabled: surgeEnabled ?? false,
      surgePercent: surgePercent ?? 10,
    },
    update: {
      ...(isEnabled !== undefined && { isEnabled }),
      ...(surgeEnabled !== undefined && { surgeEnabled }),
      ...(surgePercent !== undefined && { surgePercent: Number(surgePercent) }),
    },
    include: { slots: { orderBy: { startTime: "asc" } } },
  });
  return NextResponse.json(config);
}
