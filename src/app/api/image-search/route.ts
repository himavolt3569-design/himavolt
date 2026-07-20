import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/image-search?q=coke&page=1
 *
 * Royalty-free image search for menu items. Queries every available provider
 * IN PARALLEL and interleaves the results, so it's never "just Pexels":
 *   - Pexels     (best food/drink stock photos — needs PEXELS_API_KEY)
 *   - Openverse  (Creative-Commons — no key)
 *   - Wikimedia  (Commons — no key)
 *
 * Set PEXELS_API_KEY in .env for the best results (free at
 * https://www.pexels.com/api/), but the search still returns images without it.
 */

type NormalizedImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

/** Reject a provider that hangs so one slow source can't stall the whole search. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

const IMG_EXT = /\.(jpe?g|png|webp)$/i;

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

// ── Wikimedia Commons (fallback — no API key needed) ────────────────────

async function searchWikimedia(query: string, perPage: number): Promise<NormalizedImage[]> {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("generator", "search");
  // Bias Commons (which is noisy) toward food photos.
  u.searchParams.set("gsrsearch", `${query} food`);
  u.searchParams.set("gsrnamespace", "6"); // File: namespace
  u.searchParams.set("gsrlimit", String(perPage));
  u.searchParams.set("prop", "imageinfo");
  u.searchParams.set("iiprop", "url");
  u.searchParams.set("iiurlwidth", "400");

  const res = await fetch(u.toString(), {
    headers: { "User-Agent": "himavolt/1.0 (restaurant menu image search)" },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Wikimedia: ${res.status}`);

  type WMPage = {
    pageid: number;
    title?: string;
    imageinfo?: { url: string; thumburl?: string; descriptionurl?: string }[];
  };
  const data = (await res.json()) as { query?: { pages?: Record<string, WMPage> } };
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];

  return pages
    .filter((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii?.url || !IMG_EXT.test(ii.url)) return false; // photos only, no SVG/PDF
      if (forbidden.test(p.title ?? "")) return false;
      return true;
    })
    .map((p): NormalizedImage => {
      const ii = p.imageinfo![0];
      return {
        id: `wikimedia-${p.pageid}`,
        url: ii.url,
        thumb: ii.thumburl || ii.url,
        alt: (p.title ?? "").replace(/^File:/i, "").replace(IMG_EXT, "").trim(),
        photographer: null,
        sourceUrl: ii.descriptionurl ?? null,
      };
    });
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

  // Every available provider runs in parallel; a slow/failed one is skipped.
  const tasks: { name: string; run: () => Promise<NormalizedImage[]> }[] = [];
  if (process.env.PEXELS_API_KEY) {
    tasks.push({ name: "pexels", run: () => searchPexels(q, page, perPage) });
  }
  tasks.push({ name: "openverse", run: () => searchOpenverse(q, page, perPage) });
  tasks.push({ name: "wikimedia", run: () => searchWikimedia(q, perPage) });

  const settled = await Promise.allSettled(
    tasks.map((t) => withTimeout(t.run(), 6000)),
  );

  const buckets: NormalizedImage[][] = [];
  const providersUsed: string[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value.length > 0) {
      buckets.push(s.value);
      providersUsed.push(tasks[i].name);
    } else if (s.status === "rejected") {
      console.log(`[image-search] ${tasks[i].name} failed: ${s.reason?.message ?? s.reason}`);
    }
  });

  // Round-robin interleave so the grid clearly mixes sources (Pexels leads each
  // round for quality), deduped by url.
  const seen = new Set<string>();
  const merged: NormalizedImage[] = [];
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  for (let idx = 0; idx < maxLen && merged.length < perPage; idx++) {
    for (const b of buckets) {
      if (idx < b.length && merged.length < perPage) {
        const img = b[idx];
        if (!seen.has(img.url)) {
          seen.add(img.url);
          merged.push(img);
        }
      }
    }
  }

  if (merged.length === 0) {
    return NextResponse.json({ images: [], provider: null });
  }
  return NextResponse.json(
    { images: merged, provider: providersUsed.join("+") },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
