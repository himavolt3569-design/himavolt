import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/feedback/[orderId]
 * Public — lets a guest read back their own review for an order, including the
 * venue's reply. Same access level as the feedback-submission flow (anyone with
 * the order's QR link can submit; reading it back is no more sensitive). Order
 * ids are cuids, so they aren't guessable.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const feedback = await db.feedback.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: {
      rating: true,
      comment: true,
      name: true,
      isAnonymous: true,
      createdAt: true,
      reply: true,
      repliedAt: true,
      repliedBy: true,
    },
  });

  return NextResponse.json({ feedback: feedback ?? null });
}
