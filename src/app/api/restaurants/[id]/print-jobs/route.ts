/**
 * GET /api/restaurants/[id]/print-jobs
 *
 * Returns claimable KOT print jobs (PENDING | RETRYING | expired PRINTING) for
 * the kitchen client to poll. Auth: staff session OR restaurant owner session.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { listClaimableJobs } from "@/lib/orders/print-jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const jobs = await listClaimableJobs(id);
  return NextResponse.json({ jobs });
}
