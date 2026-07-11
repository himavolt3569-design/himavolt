import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; featureId: string }> };

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return true;
  const user = await getAuthUser();
  if (!user) return false;
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  return !!r && r.ownerId === user.id;
}

/**
 * Generic per-feature config store. Every dashboard feature tab reads/writes its
 * whole editable state here as one JSON blob, so persistence works uniformly
 * across features without a table per feature.
 *
 * GET  → { data: <saved blob> | null }
 * PUT  → body is the blob to save (upsert); returns { data }.
 *
 * Resilient: if the feature_configs table hasn't been migrated yet (first
 * deploy), GET returns null and PUT reports a soft failure so the tab keeps
 * working from in-memory defaults instead of hard-erroring.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId, featureId } = await params;
  if (!(await verifyAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const row = await db.featureConfig.findUnique({
      where: { restaurantId_featureId: { restaurantId, featureId } },
      select: { data: true },
    });
    return NextResponse.json({ data: row?.data ?? null });
  } catch {
    // Expected until the feature_configs table is migrated in — the tab falls
    // back to its in-memory defaults, so this is a soft/no-op, not an error.
    return NextResponse.json({ data: null });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id: restaurantId, featureId } = await params;
  if (!(await verifyAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const row = await db.featureConfig.upsert({
      where: { restaurantId_featureId: { restaurantId, featureId } },
      create: { restaurantId, featureId, data: data as object },
      update: { data: data as object },
      select: { data: true },
    });
    return NextResponse.json({ data: row.data });
  } catch {
    // Not-yet-migrated / transient — the client keeps the optimistic local
    // state, so this is a soft failure rather than a hard error.
    return NextResponse.json(
      { error: "Could not save. Changes are kept locally for now." },
      { status: 503 },
    );
  }
}
