import { NextRequest, NextResponse } from "next/server";

/* Instant, no-permission-prompt location guess from the request's IP —
   used to pre-fill the map picker the moment it opens, since the browser's
   Geolocation API depends on OS-level location services (often off on
   desktops) and can hang for 8-10s before timing out.

   In production (Vercel), the edge network already tags every request with
   the visitor's approximate geo via these headers — zero extra network
   calls. Locally there's no edge, so we fall back to a free IP-geo lookup. */
export async function GET(req: NextRequest) {
  const vLat = req.headers.get("x-vercel-ip-latitude");
  const vLon = req.headers.get("x-vercel-ip-longitude");
  if (vLat && vLon) {
    const vCity = req.headers.get("x-vercel-ip-city");
    return NextResponse.json({
      lat: Number(vLat),
      lon: Number(vLon),
      city: vCity ? decodeURIComponent(vCity) : undefined,
      source: "vercel",
    });
  }

  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data?.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
      return NextResponse.json({
        lat: data.latitude,
        lon: data.longitude,
        city: data.city as string | undefined,
        source: "ip",
      });
    }
  } catch (err) {
    console.error("[API GET /api/geoip]", err);
  }

  return NextResponse.json({ error: "Location unavailable" }, { status: 404 });
}
