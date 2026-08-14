import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Retention job for rider location history.
 *
 * `DriverLocationPing` records where a named person was, minute by minute. That
 * is the most sensitive data this platform holds about its own staff, and it has
 * no value once a delivery is settled and any dispute window has passed.
 *
 * Pings are deleted 7 days after their delivery reached a terminal state.
 * Deliveries still in flight are never touched regardless of age.
 *
 * Schedule in `vercel.json`:
 *   { "crons": [{ "path": "/api/cron/purge-location-pings", "schedule": "0 3 * * *" }] }
 *
 * Guarded by CRON_SECRET so it cannot be triggered by anyone who finds the URL.
 */

const RETENTION_DAYS = 7;
const TERMINAL = ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"] as const;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Refuse to run
  // unguarded rather than defaulting to open — this endpoint deletes rows.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);

  try {
    const { count } = await db.driverLocationPing.deleteMany({
      where: {
        recordedAt: { lt: cutoff },
        delivery: { status: { in: [...TERMINAL] } },
      },
    });

    if (count > 0) {
      console.log(`[cron] purged ${count} rider location pings older than ${RETENTION_DAYS} days`);
    }

    return NextResponse.json({ ok: true, deleted: count, cutoff });
  } catch (err) {
    console.error("[cron/purge-location-pings]", err);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
