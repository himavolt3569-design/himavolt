import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/image-search?q=coke&page=1
 *
 * Image search for menu items. Uses Pexels (high-quality stock photos,
 * great for food & drinks) as primary, with Openverse as fallback.
 *
 * Set PEXELS_API_KEY in .env to enable Pexels (free at https://www.pexels.com/api/).
 */

type NormalizedImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

// ── Pexels (primary — requires PEXELS_API_KEY) ──────────────────────────

async function searchPexels(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY not set");

  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("orientation", "square");

  const res = await fetch(u.toString(), {
    headers: {
      Authorization: key,
    },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Pexels: ${res.status}`);

  type PexelsPhoto = {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    src: {
      original: string;
      large2x: string;
      large: string;
      medium: string;
      small: string;
      portrait: string;
      landscape: string;
      tiny: string;
    };
    alt: string;
  };

  const data = (await res.json()) as { photos?: PexelsPhoto[] };

  return (data.photos ?? []).map((p): NormalizedImage => ({
    id: `pexels-${p.id}`,
    url: p.src.large,
    thumb: p.src.medium,
    alt: p.alt || "",
    photographer: p.photographer || null,
    sourceUrl: p.url,
  }));
}

// ── Openverse (fallback — no API key needed) ────────────────────────────

const forbidden = /\b(person|people|human|woman|man|boy|girl|child|kids?|guy|crowd|vending|machine|store|shop|shelf|shelves|factory|warehouse|logo|sign|signage|billboard|advertisement|advert|poster|neon|mural|graffiti|street art|building|architecture|panorama|landscape|aerial)\b/i;

async function searchOpenverse(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("page_size", String(perPage * 2));
  u.searchParams.set("license_type", "all");
  u.searchParams.set("mature", "false");

  const res = await fetch(u.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "himavolt/1.0 (restaurant menu image search)",
    },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Openverse: ${res.status}`);

  type OVItem = {
    id: string;
    url: string;
    thumbnail?: string;
    title?: string;
    creator?: string;
    foreign_landing_url?: string;
    tags?: { name: string }[];
  };

  const data = (await res.json()) as { results?: OVItem[] };

  return (data.results ?? [])
    .filter((p) => {
      if (forbidden.test(p.title ?? "")) return false;
      if (forbidden.test(p.creator ?? "")) return false;
      if (p.tags?.some(t => forbidden.test(t.name))) return false;
      return true;
    })
    .slice(0, perPage)
    .map((p): NormalizedImage => ({
      id: `openverse-${p.id}`,
      url: p.url,
      thumb: p.thumbnail || p.url,
      alt: p.title ?? "",
      photographer: p.creator ?? null,
      sourceUrl: p.foreign_landing_url ?? null,
    }));
}

// ── Route handler ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limit = await rateLimit(clientKey(req, "image-search"), 60_000, 30);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many searches. Slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(50, Number(searchParams.get("page") || 1) || 1));
  const perPage = 24;

  if (!q) {
    return NextResponse.json({ images: [], provider: null });
  }

  // Try Pexels first (much better food/drink results), fall back to Openverse
  const hasPexelsKey = !!process.env.PEXELS_API_KEY;
  console.log(`[image-search] query="${q}" pexelsKeyPresent=${hasPexelsKey}`);
  
  try {
    const images = await searchPexels(q, page, perPage);
    console.log(`[image-search] ✅ Pexels returned ${images.length} results`);
    return NextResponse.json(
      { images, provider: "pexels" },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch (pexelsErr) {
    console.log(`[image-search] ❌ Pexels failed: ${pexelsErr instanceof Error ? pexelsErr.message : pexelsErr}`);
    // Pexels unavailable or no API key — fall back to Openverse
  }

  try {
    const images = await searchOpenverse(q, page, perPage);
    return NextResponse.json(
      { images, provider: "openverse" },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Image search failed",
        provider: null,
      },
      { status: 502 },
    );
  }
}
