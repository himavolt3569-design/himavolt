import { NextRequest, NextResponse } from "next/server";

/* Proxies Nominatim (OpenStreetMap) geocoding server-side. Browsers can't set
   a custom User-Agent on fetch, and direct client calls to
   nominatim.openstreetmap.org are frequently blocked by ad-blockers/privacy
   extensions or ISP-level filtering — routing through our own server avoids
   both and lets us identify the app per Nominatim's usage policy. */
const NOMINATIM_HEADERS = {
  "Accept-Language": "en",
  "User-Agent": "HimaVolt/1.0 (hello@himavolt.com)",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  try {
    if (mode === "search") {
      const q = searchParams.get("q")?.trim() ?? "";
      if (q.length < 3) {
        return NextResponse.json({ error: "Query too short" }, { status: 400 });
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=np`,
        { headers: NOMINATIM_HEADERS },
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (mode === "reverse") {
      const lat = Number(searchParams.get("lat"));
      const lon = Number(searchParams.get("lon"));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        { headers: NOMINATIM_HEADERS },
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (err) {
    console.error("[API GET /api/geocode]", err);
    return NextResponse.json({ error: "Geocoding lookup failed" }, { status: 502 });
  }
}
