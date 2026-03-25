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

// POST /api/restaurants/[id]/rush-hour/slots
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, startTime, endTime, days } = body;
  if (!label || !startTime || !endTime)
    return NextResponse.json({ error: "label, startTime, endTime required" }, { status: 400 });

  // Ensure config exists
  const config = await db.rushHourConfig.upsert({
    where: { restaurantId: id },
    create: { restaurantId: id },
    update: {},
  });

  const slot = await db.rushHourSlot.create({
    data: {
      configId: config.id,
      label: label.trim(),
      startTime,
      endTime,
      days: days ?? [],
    },
  });
  return NextResponse.json(slot, { status: 201 });
}
