import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { isValidFeatureId, ALL_FEATURE_IDS } from "@/lib/restaurant-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      featuresEnabled: true,
      featuresDisabled: true,
    },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json({ restaurant, allFeatures: ALL_FEATURE_IDS });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const rawEnabled: unknown = body.featuresEnabled ?? [];
  const rawDisabled: unknown = body.featuresDisabled ?? [];
  if (!Array.isArray(rawEnabled) || !Array.isArray(rawDisabled)) {
    return NextResponse.json(
      { error: "featuresEnabled and featuresDisabled must be arrays" },
      { status: 400 },
    );
  }

  // Keep only known feature ids. Unknown/legacy ids — e.g. pre-consolidation
  // overrides (room-service, guest-billing, …) still persisted on a restaurant
  // row — are dropped rather than rejected, so stale data can never 400 and
  // lock an owner out of the feature panel. PUT rewrites the whole array, so
  // those legacy ids self-clean on the next save.
  const enabled = (rawEnabled as unknown[]).filter(
    (x): x is string => typeof x === "string" && isValidFeatureId(x),
  );
  const disabled = (rawDisabled as unknown[]).filter(
    (x): x is string => typeof x === "string" && isValidFeatureId(x),
  );

  const dedupEnabled = Array.from(new Set(enabled));
  const dedupDisabled = Array.from(new Set(disabled));
  const conflicting = dedupEnabled.filter((fid) => dedupDisabled.includes(fid));
  if (conflicting.length > 0) {
    return NextResponse.json(
      { error: `Cannot force-enable and force-disable the same feature: ${conflicting.join(", ")}` },
      { status: 400 },
    );
  }

  const updateResult = await db.restaurant.updateMany({
    where: { id, ownerId: user.id },
    data: {
      featuresEnabled: dedupEnabled,
      featuresDisabled: dedupDisabled,
    },
  });
  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  const updated = await db.restaurant.findUnique({
    where: { id },
    select: { id: true, featuresEnabled: true, featuresDisabled: true },
  });

  return NextResponse.json(updated);
}
