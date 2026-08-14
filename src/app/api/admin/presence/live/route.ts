import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { getLivePresence } from "@/lib/presence";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/presence/live
 * The individual people on the site right now, grouped-ready by scope, with an
 * ephemeral identity snapshot (name/email/city/current page). Staff entries are
 * enriched with their restaurant name in a single lookup.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { counts, entries } = await getLivePresence();

  // Resolve restaurant names for any entry that carries a restaurantId (staff).
  const restaurantIds = Array.from(
    new Set(entries.map((e) => e.restaurantId).filter((v): v is string => !!v)),
  );
  let nameById = new Map<string, string>();
  if (restaurantIds.length > 0) {
    try {
      const restaurants = await db.restaurant.findMany({
        where: { id: { in: restaurantIds } },
        select: { id: true, name: true },
      });
      nameById = new Map(restaurants.map((r) => [r.id, r.name]));
    } catch (err) {
      console.error("[Admin Presence Live] restaurant name lookup failed:", err);
    }
  }

  const enriched = entries.map((e) => ({
    ...e,
    restaurantName: e.restaurantId ? nameById.get(e.restaurantId) ?? null : null,
  }));

  return NextResponse.json(
    { counts, entries: enriched },
    { headers: { "Cache-Control": "no-store" } },
  );
}
