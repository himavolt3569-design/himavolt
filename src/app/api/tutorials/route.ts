import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { requireAdmin } from "@/lib/require-admin";

/**
 * GET /api/tutorials — public listing for the /demo page and the dashboard.
 *
 * The route itself is public (see PUBLIC_ROUTES in middleware). Visibility is
 * decided per video: `PUBLIC` videos are shown to everyone, `AUTHENTICATED`
 * ones only once some identity is present. All four auth systems count as
 * signed in here, because a staff member on the POS is as entitled to a POS
 * walkthrough as the owner is.
 */

async function isSignedIn(req: NextRequest): Promise<boolean> {
  try {
    const staff = await getStaffSession(req);
    if (staff) return true;
  } catch {
    /* fall through */
  }

  try {
    const admin = await requireAdmin();
    if (admin) return true;
  } catch {
    /* fall through */
  }

  try {
    const user = await getAuthUser();
    if (user) return true;
  } catch {
    /* signed-out visitors land here — not an error */
  }

  return false;
}

export async function GET(req: NextRequest) {
  const signedIn = await isSignedIn(req);

  // Every active video is listed for everyone: a signed-out visitor should be
  // able to see that the POS and billing walkthroughs exist, which is the whole
  // argument for signing up. What they do not get is the media itself — locked
  // rows are stripped of `videoUrl` and `embedId` below, so the gate lives in
  // this response rather than in an overlay the browser can be talked out of.
  const categories = await db.tutorialCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      sortOrder: true,
      videos: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          sourceType: true,
          videoUrl: true,
          posterUrl: true,
          provider: true,
          embedId: true,
          durationSec: true,
          width: true,
          height: true,
          audience: true,
          isFeatured: true,
          viewCount: true,
          categoryId: true,
        },
      },
    },
  });

  // Blank the media on anything this viewer is not entitled to play. Done after
  // the query so the listing still carries title, poster, duration and section —
  // enough to advertise the video without handing over the file.
  const gated = categories.map((category) => ({
    ...category,
    videos: category.videos.map((video) => {
      const locked = !signedIn && video.audience === "AUTHENTICATED";
      if (!locked) return { ...video, locked: false };
      return { ...video, locked: true, videoUrl: "", embedId: null };
    }),
  }));

  // Sections with nothing in them at all are still dropped, so no viewer sees a
  // heading over an empty grid.
  const visible = gated.filter((c) => c.videos.length > 0);

  const playable = visible.flatMap((c) => c.videos).filter((v) => !v.locked);
  const featured = playable.find((v) => v.isFeatured) ?? playable[0] ?? null;

  return NextResponse.json(
    { categories: visible, featured, signedIn },
    {
      headers: {
        // Short shared cache: the content changes rarely, but a newly published
        // video should appear without a deploy. Varies by auth implicitly
        // because signed-in responses differ — hence private.
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    },
  );
}
