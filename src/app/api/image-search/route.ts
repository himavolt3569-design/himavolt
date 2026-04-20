import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/image-search?q=pizza&page=1
 *
 * Proxies Pexels (preferred) or Unsplash for food/drink image search,
 * keeping the API key server-side. Results are normalized to a shared shape
 * so the client renders one grid regardless of provider.
 *
 * Env:
 *   PEXELS_API_KEY       — preferred
 *   UNSPLASH_ACCESS_KEY  — fallback
 */

type NormalizedImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

async function searchPexels(query: string, page: number, perPage: number, key: string) {
  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  const res = await fetch(u.toString(), {
    headers: { Authorization: key },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Pexels: ${res.status}`);
  type PexelsPhoto = {
    id: number;
    alt?: string;
    url?: string;
    photographer?: string;
    src: { large2x?: string; large?: string; medium?: string; small?: string };
  };
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos ?? []).map((p): NormalizedImage => ({
    id: `pexels-${p.id}`,
    url: p.src.large2x ?? p.src.large ?? p.src.medium ?? "",
    thumb: p.src.medium ?? p.src.small ?? p.src.large ?? "",
    alt: p.alt ?? "",
    photographer: p.photographer ?? null,
    sourceUrl: p.url ?? null,
  }));
}

async function searchUnsplash(query: string, page: number, perPage: number, key: string) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("content_filter", "high");
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Unsplash: ${res.status}`);
  type UnsplashPhoto = {
    id: string;
    alt_description?: string;
    links?: { html?: string };
    user?: { name?: string };
    urls: { regular?: string; small?: string; thumb?: string };
  };
  const data = (await res.json()) as { results?: UnsplashPhoto[] };
  return (data.results ?? []).map((p): NormalizedImage => ({
    id: `unsplash-${p.id}`,
    url: p.urls.regular ?? "",
    thumb: p.urls.small ?? p.urls.thumb ?? "",
    alt: p.alt_description ?? "",
    photographer: p.user?.name ?? null,
    sourceUrl: p.links?.html ?? null,
  }));
}

export async function GET(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "image-search"), 60_000, 30);
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

  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  try {
    if (pexelsKey) {
      const images = await searchPexels(q, page, perPage, pexelsKey);
      return NextResponse.json(
        { images, provider: "pexels" },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    }
    if (unsplashKey) {
      const images = await searchUnsplash(q, page, perPage, unsplashKey);
      return NextResponse.json(
        { images, provider: "unsplash" },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    }
    return NextResponse.json(
      {
        error:
          "Image search is not configured. Set PEXELS_API_KEY or UNSPLASH_ACCESS_KEY.",
        provider: null,
      },
      { status: 501 },
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
