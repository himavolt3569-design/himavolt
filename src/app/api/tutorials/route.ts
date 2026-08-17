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

  // Signed-out visitors see PUBLIC only. Everyone else sees both.
  const audienceFilter = signedIn
    ? undefined
    : { audience: "PUBLIC" as const };

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
        where: { isActive: true, ...audienceFilter },
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

  // Drop sections that ended up empty for this viewer, so a signed-out visitor
  // never sees a heading with nothing under it.
  const visible = categories.filter((c) => c.videos.length > 0);

  const featured =
    visible.flatMap((c) => c.videos).find((v) => v.isFeatured) ??
    visible[0]?.videos[0] ??
    null;

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
