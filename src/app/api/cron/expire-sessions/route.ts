import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Browse-only sessions (guest scanned QR but never ordered) are held for 3
// hours, then swept. Anything longer is an abandoned scan, not a live table.
const BROWSE_HOLD_MINUTES = 180;

/**
 * GET /api/cron/expire-sessions
 * Secured by CRON_SECRET bearer token (Vercel Cron sends this automatically).
 *
 * Sweeps stale table sessions:
 *  - browse-only sessions (orderId: null) older than 3 hours → deleted
 *  - active sessions whose order was REJECTED → deleted (the reject/cancel
 *    paths now free these inline; this catches anything that slipped through
 *    before that fix or during an outage)
 *
 * Deletes rather than marks inactive: the @@unique([restaurantId, tableNo,
 * isActive]) constraint means bulk-flipping to inactive can collide with
 * existing inactive rows, and dead sessions have no audit value.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const browseCutoff = new Date(Date.now() - BROWSE_HOLD_MINUTES * 60 * 1000);

  const staleBrowse = await db.tableSession.deleteMany({
    where: {
      orderId: null,
      startedAt: { lt: browseCutoff },
    },
  });

  const orphanedRejected = await db.tableSession.deleteMany({
    where: {
      isActive: true,
      order: { status: "REJECTED" },
    },
  });

  if (staleBrowse.count > 0 || orphanedRejected.count > 0) {
    logAudit({
      action: "TABLE_SESSIONS_SWEPT",
      entity: "TableSession",
      entityId: "cron",
      detail: `Session sweep: ${staleBrowse.count} stale browse session(s), ${orphanedRejected.count} orphaned rejected-order session(s)`,
      metadata: {
        staleBrowse: staleBrowse.count,
        orphanedRejected: orphanedRejected.count,
      },
    });
  }

  return NextResponse.json({
    success: true,
    staleBrowseDeleted: staleBrowse.count,
    orphanedRejectedDeleted: orphanedRejected.count,
    checkedAt: new Date().toISOString(),
  });
}
