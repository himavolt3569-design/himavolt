import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { getPresenceCounts } from "@/lib/presence";

/**
 * GET /api/admin/presence
 * Live count of who is on the site right now, broken down by scope.
 * Anyone with a heartbeat in the last `ttlSeconds` window is counted.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  return NextResponse.json(await getPresenceCounts());
}
