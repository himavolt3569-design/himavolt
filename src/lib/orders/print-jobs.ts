/**
 * Phase 2.5d — Durable KOT print-job outbox helpers.
 *
 * Claim flow:
 *   1. Client polls GET /api/restaurants/[id]/print-jobs  → list of PENDING/RETRYING jobs
 *   2. Client POSTs claim action → server does atomic updateMany (PENDING/RETRYING → PRINTING)
 *   3. Client prints, then POSTs printed/failed action.
 *
 * Duplicate-print protection: the atomic claim (updateMany with status condition)
 * ensures only ONE client moves a job to PRINTING. A dead client's lease expires
 * after CLAIM_LEASE_MS and the job becomes re-claimable.
 */

import { db } from "@/lib/db";

const CLAIM_LEASE_MS = 30_000;

export interface KotPayload {
  restaurantName: string | null;
  orderNo: string;
  tableNo: number | string | null;
  roomNo: string | null;
  guestName: string | null;
  note: string | null;
  sourceType: string | null;
  items: Array<{ name: string; quantity: number; drinkCategory?: string | null }>;
}

/** List all jobs that a kitchen client may claim or retry. */
export async function listClaimableJobs(restaurantId: string) {
  const now = new Date();
  return db.printJob.findMany({
    where: {
      restaurantId,
      type: "KOT",
      OR: [
        { status: "PENDING" },
        { status: "RETRYING" },
        // Expired PRINTING leases can be re-claimed by another client.
        { status: "PRINTING", lockedUntil: { lte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Atomically claim a job: PENDING | RETRYING | expired-PRINTING → PRINTING.
 * Returns true if THIS client won the claim; false if another client beat it.
 */
export async function claimPrintJob(
  jobId: string,
  restaurantId: string,
  clientId: string,
): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + CLAIM_LEASE_MS);

  const result = await db.printJob.updateMany({
    where: {
      id: jobId,
      restaurantId,
      OR: [
        { status: "PENDING" },
        { status: "RETRYING" },
        { status: "PRINTING", lockedUntil: { lte: now } },
      ],
    },
    data: {
      status: "PRINTING",
      claimedBy: clientId,
      claimedAt: now,
      lockedUntil,
      attempts: { increment: 1 },
    },
  });
  return result.count === 1;
}

/** Mark a job the caller claimed as successfully printed. */
export async function markPrinted(
  jobId: string,
  restaurantId: string,
  clientId: string,
): Promise<boolean> {
  const result = await db.printJob.updateMany({
    where: { id: jobId, restaurantId, claimedBy: clientId, status: "PRINTING" },
    data: { status: "PRINTED", printedAt: new Date(), lockedUntil: null },
  });
  return result.count === 1;
}

/** Mark a job the caller claimed as failed; optionally schedule a retry. */
export async function markFailed(
  jobId: string,
  restaurantId: string,
  clientId: string,
  error: string,
  retry: boolean,
): Promise<boolean> {
  const result = await db.printJob.updateMany({
    where: { id: jobId, restaurantId, claimedBy: clientId, status: "PRINTING" },
    data: {
      status: retry ? "RETRYING" : "FAILED",
      lastError: error.slice(0, 500),
      lockedUntil: null,
      claimedBy: null,
    },
  });
  return result.count === 1;
}
