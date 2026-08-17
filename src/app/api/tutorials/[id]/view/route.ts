import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * POST /api/tutorials/[id]/view
 *
 * Fire-and-forget view counter, called once a viewer has actually watched a few
 * seconds rather than on mount. Rate limited per client so the number means
 * something; it is a vanity metric, not billing, so a miss is fine.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const rl = await rateLimit(clientKey(req, `tutorial-view:${id}`), 60 * 60_000, 5);
  if (!rl.ok) {
    // Silently accept — the client has nothing useful to do with a 429 here.
    return NextResponse.json({ ok: true });
  }

  try {
    await db.tutorialVideo.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Deleted between render and playback. Not worth surfacing.
  }

  return NextResponse.json({ ok: true });
}
