import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function prevDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calcStreak(dates: string[], startDate: string): number {
  let streak = 0;
  let cursor = startDate;
  for (const d of dates) {
    if (d === cursor) {
      streak++;
      cursor = prevDay(cursor);
    } else {
      break;
    }
  }
  return streak;
}

// GET — returns { checkedInToday, streak, total }
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayStr();

  const [checkedInToday, all] = await Promise.all([
    db.customerCheckIn.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),
    db.customerCheckIn.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  const dates = all.map((r) => r.date);
  const streak = checkedInToday ? calcStreak(dates, today) : 0;

  return NextResponse.json({
    checkedInToday: !!checkedInToday,
    streak,
    total: all.length,
  });
}

// POST — check in for today (idempotent)
export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayStr();

  await db.customerCheckIn.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: { userId: user.id, date: today },
    update: {},
  });

  const all = await db.customerCheckIn.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const dates = all.map((r) => r.date);
  const streak = calcStreak(dates, today);

  return NextResponse.json({
    checkedInToday: true,
    streak,
    total: all.length,
  });
}
