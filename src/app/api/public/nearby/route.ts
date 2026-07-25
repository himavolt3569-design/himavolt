import { NextRequest, NextResponse } from "next/server";
import { findNearbyRestaurants } from "@/lib/discovery/find-nearby";
import { nearbySearchSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/audit";

/**
 * Proximity search for the public site.
 *
 * POST, not GET, and deliberately so: the body carries a customer's precise
 * coordinates. In a query string those would end up in server logs, browser
 * history, `Referer` headers and CDN cache keys. A body keeps them out of all
 * four. It also means the response is never cached, which is correct — "open
 * right now" cannot be served stale.
 */

export async function POST(req: NextRequest) {
  // Unauthenticated and it reads the restaurant table, so it needs a limit or it
  // becomes a scraper. The radius is clamped inside the service as well.
  const ip = getClientIp(req.headers) ?? "unknown";
  const limited = await rateLimit(`nearby:${ip}`, 60_000, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds || 60) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = nearbySearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search" },
      { status: 400 },
    );
  }

  try {
    const restaurants = await findNearbyRestaurants(parsed.data);
    return NextResponse.json(
      { restaurants, count: restaurants.length },
      // Never cached: coordinates are personal and openness is time-sensitive.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/public/nearby]", err);
    return NextResponse.json(
      { error: "Could not search nearby restaurants." },
      { status: 503 },
    );
  }
}
