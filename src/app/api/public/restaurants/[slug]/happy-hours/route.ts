import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/restaurants/[slug]/happy-hours
 * Returns active happy-hour configurations + a computed `isHappyNow` flag
 * based on server time + day of week.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: encodedSlug } = await params;
    const slug = decodeURIComponent(encodedSlug);

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const hours = await db.happyHour.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const today = dayMap[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map((n) => parseInt(n, 10));
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };

    const activeHours = hours.filter((h) => {
      if (h.days.length > 0 && !h.days.includes(today)) return false;
      const start = toMin(h.startTime);
      const end = toMin(h.endTime);
      if (end >= start) {
        return currentMinutes >= start && currentMinutes < end;
      }
      // overnight window (e.g. 22:00 - 02:00)
      return currentMinutes >= start || currentMinutes < end;
    });

    return NextResponse.json({
      happyHours: hours,
      activeHours,
      isHappyNow: activeHours.length > 0,
    });
  } catch (err) {
    console.error("[public happy-hours GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
