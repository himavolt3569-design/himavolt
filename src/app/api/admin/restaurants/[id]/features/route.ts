import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { isValidFeatureId, ALL_FEATURE_IDS } from "@/lib/restaurant-types";

type Params = { params: Promise<{ id: string }> };

/** GET — current override state for one restaurant (admin only). */
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      featuresEnabled: true,
      featuresDisabled: true,
    },
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  return NextResponse.json({
    restaurant,
    allFeatures: ALL_FEATURE_IDS,
  });
}

/** PUT — full replacement of override lists. */
export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const rawEnabled: unknown = body.featuresEnabled ?? [];
  const rawDisabled: unknown = body.featuresDisabled ?? [];

  if (!Array.isArray(rawEnabled) || !Array.isArray(rawDisabled)) {
    return NextResponse.json({ error: "featuresEnabled and featuresDisabled must be arrays" }, { status: 400 });
  }

  const enabled = (rawEnabled as unknown[]).filter((x): x is string => typeof x === "string");
  const disabled = (rawDisabled as unknown[]).filter((x): x is string => typeof x === "string");

  const invalid = [...enabled, ...disabled].filter((x) => !isValidFeatureId(x));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Unknown feature ids: ${invalid.join(", ")}` }, { status: 400 });
  }

  const dedupEnabled = Array.from(new Set(enabled));
  const dedupDisabled = Array.from(new Set(disabled));
  const conflicting = dedupEnabled.filter((id) => dedupDisabled.includes(id));
  if (conflicting.length > 0) {
    return NextResponse.json({ error: `Cannot force-enable and force-disable the same feature: ${conflicting.join(", ")}` }, { status: 400 });
  }

  try {
    const updated = await db.restaurant.update({
      where: { id },
      data: {
        featuresEnabled: dedupEnabled,
        featuresDisabled: dedupDisabled,
      },
      select: { id: true, featuresEnabled: true, featuresDisabled: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
}
