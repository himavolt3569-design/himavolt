/**
 * POST /api/restaurants/[id]/print-jobs/[jobId]
 *
 * Body: { action: "claim" | "printed" | "failed", clientId: string, error?: string, retry?: boolean }
 *
 * - claim   → atomic PENDING/RETRYING → PRINTING (returns { claimed: true/false })
 * - printed → PRINTING → PRINTED (caller must be the lease holder)
 * - failed  → PRINTING → FAILED or RETRYING (caller must be the lease holder)
 *
 * Auth: staff session OR restaurant owner session.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import {
  claimPrintJob,
  markPrinted,
  markFailed,
} from "@/lib/orders/print-jobs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const { id, jobId } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const staff = await getStaffSession(req);
  if (!staff || staff.restaurantId !== id) {
    const user = await getOrCreateUser();
    if (!user || restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, clientId, error: errorMsg, retry } = body as {
    action?: string;
    clientId?: string;
    error?: string;
    retry?: boolean;
  };

  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  switch (action) {
    case "claim": {
      const claimed = await claimPrintJob(jobId, id, clientId);
      return NextResponse.json({ claimed });
    }

    case "printed": {
      const ok = await markPrinted(jobId, id, clientId);
      if (!ok) {
        return NextResponse.json(
          { error: "Job not found, not in PRINTING state, or claimed by a different client" },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    case "failed": {
      const ok = await markFailed(
        jobId,
        id,
        clientId,
        typeof errorMsg === "string" ? errorMsg : "unknown error",
        retry !== false,
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Job not found, not in PRINTING state, or claimed by a different client" },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${String(action)}` },
        { status: 400 },
      );
  }
}
