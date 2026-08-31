import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type NormalizedImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// ── Food-only filtering ─────────────────────────────────────────────────

const NOISE =
  /\b(dogs?|cats?|pets?|pupp(y|ies)|kittens?|animals?|birds?|dolls?|figurines?|plush|anime|manga|cosplay|costumes?|cars?|trucks?|automobiles?|vehicles?|motorcycles?|trains?|aircraft|airplanes?|bombs?|grenades?|weapons?|guns?|rifles?|protests?|elections?|politic\w*|concerts?|tattoos?|selfies?|nude|nasa|planets?|spacecraft|satellites?|software|screenshots?|qr[ -]?code)\b/i;

const forbidden =
  /\b(person|people|human|woman|man|boy|girl|child|kids?|guy|crowd|vending|machine|store|shop|shelf|shelves|factory|warehouse|logo|sign|signage|billboard|advertisement|advert|poster|neon|mural|graffiti|street art|building|architecture|panorama|landscape|aerial)\b/i;

const DRINKY =
  /\b(coke|cola|pepsi|fanta|sprite|soda|juice|tea|chai|coffee|espresso|latte|cappuccino|mocha|beer|wine|whisky|whiskey|vodka|rum|cocktail|mocktail|mojito|smoothie|milkshake|shake|lassi|lemonade|water|drink|beverage)\b/i;

const FOOD_WORDS =
  /\b(food|dish(es)?|meals?|cuisine|recipes?|restaurants?|cafe|kitchen|menu|snacks?|desserts?|breakfast|lunch|dinner|appetiz\w*|gourmet|homemade|delicious|tasty|edible|plates?|bowls?|platter|served|serving|buffet|thali|grilled|fried|roasted|steamed|boiled|baked|bakery|spicy|savou?ry|drinks?|beverages?|cocktails?|coffee|tea|juice|soda|beer|wine|chicken|beef|buff|buffalo|pork|mutton|lamb|goat|boar|fish|seafood|prawns?|shrimps?|eggs?|cheese|butter|cream|milk|yogh?urt|paneer|tofu|bread|rice|noodles?|pasta|soup|stew|curry|salad|meat|vegetables?|veg|vegan|vegetarian)\b/i;

const MIN_RESULTS = 8;

function isMenuPhoto(text: string): boolean {
  return !NOISE.test(text) && !forbidden.test(text);
}

function biasQuery(q: string, type: string | null): string {
  const wantDrink = type === "drink" || (type !== "food" && DRINKY.test(q));
  const terms = wantDrink ? ["drink", "beverage"] : ["food", "dish"];
  const missing = terms.filter((t) => !new RegExp(`\\b${t}\\b`, "i").test(q));
  return missing.length ? `${q} ${missing.join(" ")}` : q;
}

// ── Pexels ──────────────────────────────────────────────────────────────
let pexelsKeyRejected = false;
async function searchPexels(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY not set");
  if (pexelsKeyRejected) throw new Error("PEXELS_API_KEY was rejected earlier; skipping");

  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("orientation", "square");

  const res = await fetch(u.toString(), {
    headers: { Authorization: key },
    next: { revalidate: 600 },
  });
  if (res.status === 401 || res.status === 403) {
    pexelsKeyRejected = true;
    throw new Error(`Pexels rejected API Key`);
  }
  if (!res.ok) throw new Error(`Pexels: ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as { photos?: any[] };
  return (data.photos ?? [])
    .filter((p) => isMenuPhoto(p.alt ?? ""))
    .map((p): NormalizedImage => ({
      id: `pexels-${p.id}`,
      url: p.src.large,
      thumb: p.src.medium,
      alt: p.alt || "",
      photographer: p.photographer || null,
      sourceUrl: p.url,
    }));
}

// ── Unsplash ────────────────────────────────────────────────────────────
let unsplashKeyRejected = false;
async function searchUnsplash(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY not set");
  if (unsplashKeyRejected) throw new Error("UNSPLASH_ACCESS_KEY was rejected earlier; skipping");

  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("orientation", "squarish");

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 600 },
  });
  if (res.status === 401 || res.status === 403) {
    unsplashKeyRejected = true;
    throw new Error(`Unsplash rejected API Key`);
  }
  if (!res.ok) throw new Error(`Unsplash: ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as { results?: any[] };
  return (data.results ?? [])
    .filter((p) => isMenuPhoto(p.alt_description ?? p.description ?? ""))
    .map((p): NormalizedImage => ({
      id: `unsplash-${p.id}`,
      url: p.urls.regular,
      thumb: p.urls.small,
      alt: p.alt_description || p.description || "",
      photographer: p.user?.name || null,
      sourceUrl: p.links?.html || null,
    }));
}

// ── Pixabay ─────────────────────────────────────────────────────────────
let pixabayKeyRejected = false;
async function searchPixabay(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("PIXABAY_API_KEY not set");
  if (pixabayKeyRejected) throw new Error("PIXABAY_API_KEY was rejected earlier; skipping");

  const u = new URL("https://pixabay.com/api/");
  u.searchParams.set("key", key);
  u.searchParams.set("q", query);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("image_type", "photo");
  u.searchParams.set("safesearch", "true");

  const res = await fetch(u.toString(), {
    next: { revalidate: 600 },
  });
  if (res.status === 401 || res.status === 403) {
    pixabayKeyRejected = true;
    throw new Error(`Pixabay rejected API Key`);
  }
  if (!res.ok) throw new Error(`Pixabay: ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as { hits?: any[] };
  return (data.hits ?? [])
    .filter((p) => isMenuPhoto(p.tags ?? ""))
    .map((p): NormalizedImage => ({
      id: `pixabay-${p.id}`,
      url: p.largeImageURL,
      thumb: p.webformatURL,
      alt: p.tags || "",
      photographer: p.user || null,
      sourceUrl: p.pageURL || null,
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
  const type = searchParams.get("type");
  const page = Math.max(1, Math.min(50, Number(searchParams.get("page") || 1) || 1));
  const perPage = 24;

  if (!q) {
    return NextResponse.json({ images: [], provider: null, degraded: false, missingKeys: false });
  }

  const sq = biasQuery(q, type);

  const hasPexels = !!process.env.PEXELS_API_KEY;
  const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY;
  const hasPixabay = !!process.env.PIXABAY_API_KEY;

  if (!hasPexels && !hasUnsplash && !hasPixabay) {
    return NextResponse.json({ images: [], provider: null, degraded: false, missingKeys: true });
  }

  async function collect(query: string) {
    const tasks: { name: string; run: () => Promise<NormalizedImage[]> }[] = [];
    if (hasPexels) tasks.push({ name: "pexels", run: () => searchPexels(query, page, perPage) });
    if (hasUnsplash) tasks.push({ name: "unsplash", run: () => searchUnsplash(query, page, perPage) });
    if (hasPixabay) tasks.push({ name: "pixabay", run: () => searchPixabay(query, page, perPage) });

    const settled = await Promise.allSettled(tasks.map((t) => withTimeout(t.run(), 6000)));

    const buckets: NormalizedImage[][] = [];
    const providers: string[] = [];
    let failed = 0;
    settled.forEach((s, i) => {
      if (s.status === "fulfilled" && s.value.length > 0) {
        buckets.push(s.value);
        providers.push(tasks[i].name);
      } else if (s.status === "rejected") {
        failed++;
        console.warn(`[image-search] ${tasks[i].name} failed: ${s.reason?.message ?? s.reason}`);
      }
    });
    return { buckets, providers, degraded: failed === tasks.length };
  }

  const seen = new Set<string>();
  const merged: NormalizedImage[] = [];
  function drain(buckets: NormalizedImage[][], keep: (img: NormalizedImage) => boolean) {
    const maxLen = Math.max(0, ...buckets.map((b) => b.length));
    for (let idx = 0; idx < maxLen && merged.length < perPage; idx++) {
      for (const b of buckets) {
        if (idx < b.length && merged.length < perPage) {
          const img = b[idx];
          if (!seen.has(img.url) && keep(img)) {
            seen.add(img.url);
            merged.push(img);
          }
        }
      }
    }
  }

  const first = await collect(sq);
  drain(first.buckets, () => true);
  const providersUsed = [...first.providers];

  if (merged.length < MIN_RESULTS && sq !== q) {
    const second = await collect(q);
    drain(second.buckets, (img) => FOOD_WORDS.test(img.alt));
    for (const p of second.providers) {
      if (!providersUsed.includes(p)) providersUsed.push(p);
    }
  }

  if (merged.length === 0) {
    return NextResponse.json({ images: [], provider: null, degraded: first.degraded, missingKeys: false });
  }
  return NextResponse.json(
    { images: merged, provider: providersUsed.join("+"), degraded: first.degraded, missingKeys: false },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
