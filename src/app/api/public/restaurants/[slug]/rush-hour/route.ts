import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/restaurants/[slug]/rush-hour
// Returns rush hour config + whether it is currently active
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await db.rushHourConfig.findUnique({
    where: { restaurantId: restaurant.id },
    include: { slots: { where: { isActive: true }, orderBy: { startTime: "asc" } } },
  });

  if (!config || !config.isEnabled) {
    return NextResponse.json({ isEnabled: false, isRushNow: false, surgePercent: 0 });
  }

  // Determine if current time falls in any active slot
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayNames[now.getDay()];

  const isRushNow = config.slots.some((slot) => {
    if (slot.days.length > 0 && !slot.days.includes(today)) return false;
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    return currentMins >= sh * 60 + sm && currentMins < eh * 60 + em;
  });

  return NextResponse.json({
    isEnabled: true,
    isRushNow,
    surgeEnabled: config.surgeEnabled,
    surgePercent: config.surgeEnabled ? config.surgePercent : 0,
    slots: config.slots,
  });
}
