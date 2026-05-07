import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/image-search?q=pizza&page=1
 *
 * Free image search — no API key required. Uses Openverse (aggregates
 * Creative Commons / public-domain photos from Flickr, Wikimedia, etc.)
 * with a Wikimedia Commons fallback if Openverse is unreachable.
 */

type NormalizedImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

async function searchOpenverse(query: string, page: number, perPage: number) {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("page_size", String(perPage));
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
  };
  const data = (await res.json()) as { results?: OVItem[] };
  return (data.results ?? []).map((p): NormalizedImage => ({
    id: `openverse-${p.id}`,
    url: p.url,
    thumb: p.thumbnail || p.url,
    alt: p.title ?? "",
    photographer: p.creator ?? null,
    sourceUrl: p.foreign_landing_url ?? null,
  }));
}

async function searchWikimedia(query: string, perPage: number) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("formatversion", "2");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  u.searchParams.set("gsrnamespace", "6");
  u.searchParams.set("gsrlimit", String(perPage));
  u.searchParams.set("prop", "imageinfo");
  u.searchParams.set("iiprop", "url");
  u.searchParams.set("iiurlwidth", "600");

  // Wikimedia strictly rate-limits anonymous requests without a proper
  // User-Agent. The policy requires an app name, version, and contact info.
  const res = await fetch(u.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "himavolt/1.0 (https://himavolt.app; contact: support@himavolt.app)",
      "Api-User-Agent":
        "himavolt/1.0 (https://himavolt.app; contact: support@himavolt.app)",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Wikimedia: ${res.status}`);

  type WMPage = {
    pageid: number;
    title: string;
    imageinfo?: { url: string; thumburl?: string }[];
  };
  const data = (await res.json()) as { query?: { pages?: WMPage[] } };
  const pages = data.query?.pages ?? [];
  return pages
    .map((p): NormalizedImage | null => {
      const info = p.imageinfo?.[0];
      if (!info) return null;
      return {
        id: `wikimedia-${p.pageid}`,
        url: info.url,
        thumb: info.thumburl || info.url,
        alt: p.title.replace(/^File:/, "").replace(/\.(jpg|jpeg|png|webp)$/i, ""),
        photographer: null,
        sourceUrl: `https://commons.wikimedia.org/?curid=${p.pageid}`,
      };
    })
    .filter((x): x is NormalizedImage => x !== null);
}

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

  try {
    const images = await searchOpenverse(q, page, perPage);
    return NextResponse.json(
      { images, provider: "openverse" },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch {
    try {
      const images = await searchWikimedia(q, perPage);
      return NextResponse.json(
        { images, provider: "wikimedia" },
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
}
