import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/image-search?q=coke&type=drink&page=1
 *
 * Royalty-free image search for menu items. Queries every available provider
 * IN PARALLEL and interleaves the results, so it's never "just Pexels":
 *   - Pexels     (best food/drink stock photos — needs PEXELS_API_KEY)
 *   - Openverse  (Creative-Commons — no key)
 *   - Wikimedia  (Commons — no key)
 *
 * Results are restricted to food and drink — see "Food-only filtering" below.
 * `type` is "food" or "drink"; omit it and it's inferred from the query.
 *
 * Set PEXELS_API_KEY in .env for the best results (free at
 * https://www.pexels.com/api/), but the search still returns images without it.
 *
 * Response: { images, provider, degraded }. `degraded` means every provider
 * errored — an outage, not an empty result set.
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

/**
 * Test the extension against the URL *path*, not the whole URL. Wikimedia now
 * appends `?utm_source=…&utm_campaign=imageinfo` to every imageinfo URL, so an
 * end-anchored test against the full string matches nothing and silently throws
 * away every result.
 */
function isPhotoUrl(u: string): boolean {
  try {
    return IMG_EXT.test(new URL(u).pathname);
  } catch {
    return IMG_EXT.test(u);
  }
}

/** Drop tracking params so they never get persisted onto the dish record. */
function stripQuery(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return u;
  }
}

// ── Food-only filtering ─────────────────────────────────────────────────
//
// A bare dish name is a terrible image query: "momo" returns a shiba inu and a
// collectible doll, "mustang" returns Ford Mustangs, "coke" returns Christmas
// ornaments and a truck crash. Two defences, in this order:
//
//   1. Bias the query at the source — "momo food dish" instead of "momo". This
//      does most of the work, because it moves relevance ranking onto our side
//      before any result is returned.
//   2. Reject what still slips through, by keyword.
//
// Filtering alone is not enough: the dish name is itself a food word, so any
// "does this text mention food?" test passes junk like "Coke Flower".

/** Scenes that are never a menu photo. Drawn from real search output. */
const NOISE =
  /\b(dogs?|cats?|pets?|pupp(y|ies)|kittens?|animals?|birds?|dolls?|figurines?|plush|anime|manga|cosplay|costumes?|cars?|trucks?|automobiles?|vehicles?|motorcycles?|trains?|aircraft|airplanes?|bombs?|grenades?|weapons?|guns?|rifles?|protests?|elections?|politic\w*|concerts?|tattoos?|selfies?|nude|nasa|planets?|spacecraft|satellites?|software|screenshots?|qr[ -]?code)\b/i;

/** Subjects the original filter already excluded — people, shops, signage, scenery. */
const forbidden =
  /\b(person|people|human|woman|man|boy|girl|child|kids?|guy|crowd|vending|machine|store|shop|shelf|shelves|factory|warehouse|logo|sign|signage|billboard|advertisement|advert|poster|neon|mural|graffiti|street art|building|architecture|panorama|landscape|aerial)\b/i;

/** Query words that mean the item is a drink, so the bias term matches. */
const DRINKY =
  /\b(coke|cola|pepsi|fanta|sprite|soda|juice|tea|chai|coffee|espresso|latte|cappuccino|mocha|beer|wine|whisky|whiskey|vodka|rum|cocktail|mocktail|mojito|smoothie|milkshake|shake|lassi|lemonade|water|drink|beverage)\b/i;

/**
 * Ingredients, preparations and dining context — deliberately NOT dish names.
 * A query is usually itself a dish name, so including those would let anything
 * sharing that name through, which is the trap that admits a doll called Momo.
 * Used only to vet unbiased top-up results (see MIN_RESULTS).
 */
const FOOD_WORDS =
  /\b(food|dish(es)?|meals?|cuisine|recipes?|restaurants?|cafe|kitchen|menu|snacks?|desserts?|breakfast|lunch|dinner|appetiz\w*|gourmet|homemade|delicious|tasty|edible|plates?|bowls?|platter|served|serving|buffet|thali|grilled|fried|roasted|steamed|boiled|baked|bakery|spicy|savou?ry|drinks?|beverages?|cocktails?|coffee|tea|juice|soda|beer|wine|chicken|beef|buff|buffalo|pork|mutton|lamb|goat|boar|fish|seafood|prawns?|shrimps?|eggs?|cheese|butter|cream|milk|yogh?urt|paneer|tofu|bread|rice|noodles?|pasta|soup|stew|curry|salad|meat|vegetables?|veg|vegan|vegetarian)\b/i;

/** Below this, retry unbiased so rare dish names don't come back near-empty. */
const MIN_RESULTS = 8;

/** Everything a provider tells us about an image, as one searchable string. */
function haystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Keep only what could plausibly be a plate of food or a glass of something. */
function isMenuPhoto(text: string): boolean {
  return !NOISE.test(text) && !forbidden.test(text);
}

/**
 * Append food/drink context so the provider ranks menu photos first. Words
 * already present are not repeated — `DrinksTab` sends "mojito drink", which
 * must not become "mojito drink drink beverage".
 */
function biasQuery(q: string, type: string | null): string {
  const wantDrink = type === "drink" || (type !== "food" && DRINKY.test(q));
  const terms = wantDrink ? ["drink", "beverage"] : ["food", "dish"];
  const missing = terms.filter((t) => !new RegExp(`\\b${t}\\b`, "i").test(q));
  return missing.length ? `${q} ${missing.join(" ")}` : q;
}

// ── Pexels (primary — requires PEXELS_API_KEY) ──────────────────────────

/**
 * A key the API rejects stays rejected until someone rotates it, so remember
 * that and stop paying the round-trip on every subsequent search. Module scope
 * means this resets on the next cold start, which is exactly when a newly
 * deployed key should get another chance.
 */
let pexelsKeyRejected = false;

async function searchPexels(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY not set");
  if (pexelsKeyRejected) {
    throw new Error("PEXELS_API_KEY was rejected earlier; skipping until redeploy");
  }

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
  if (res.status === 401 || res.status === 403) {
    pexelsKeyRejected = true;
    throw new Error(
      `Pexels rejected PEXELS_API_KEY (${res.status}). Generate a new one at ` +
        `https://www.pexels.com/api/ and update the env var — search continues ` +
        `on Openverse + Wikimedia meanwhile.`,
    );
  }
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

// ── Openverse (fallback — no API key needed) ────────────────────────────

/**
 * Openverse hard-caps anonymous requests at 20 results per page — asking for 21
 * returns `401 {"detail":"page_size may not exceed 20 for anonymous requests"}`,
 * not a clamped response. Do not raise this without adding an API token.
 */
const OPENVERSE_ANON_MAX_PAGE_SIZE = 20;

async function searchOpenverse(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page", String(page));
  // Over-fetch so the `forbidden` filter below has slack, but never past the cap.
  u.searchParams.set("page_size", String(Math.min(perPage * 2, OPENVERSE_ANON_MAX_PAGE_SIZE)));
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
    .filter((p) =>
      isMenuPhoto(haystack([p.title, p.creator, p.tags?.map((t) => t.name).join(" ")])),
    )
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
  // `query` already carries the food/drink bias term (see biasQuery).
  u.searchParams.set("gsrsearch", query);
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
      if (!ii?.url || !isPhotoUrl(ii.url)) return false; // photos only, no SVG/PDF
      return isMenuPhoto(p.title ?? "");
    })
    .map((p): NormalizedImage => {
      const ii = p.imageinfo![0];
      return {
        id: `wikimedia-${p.pageid}`,
        url: stripQuery(ii.url),
        thumb: stripQuery(ii.thumburl || ii.url),
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
  // Optional "food" | "drink". Omitted means infer it from the query text.
  const type = searchParams.get("type");
  const page = Math.max(1, Math.min(50, Number(searchParams.get("page") || 1) || 1));
  const perPage = 24;

  if (!q) {
    return NextResponse.json({ images: [], provider: null, degraded: false });
  }

  // Search for "momo food dish", never bare "momo". See biasQuery.
  const sq = biasQuery(q, type);

  // Every available provider runs in parallel; a slow/failed one is skipped.
  async function collect(query: string) {
    const tasks: { name: string; run: () => Promise<NormalizedImage[]> }[] = [];
    if (process.env.PEXELS_API_KEY) {
      tasks.push({ name: "pexels", run: () => searchPexels(query, page, perPage) });
    }
    tasks.push({ name: "openverse", run: () => searchOpenverse(query, page, perPage) });
    tasks.push({ name: "wikimedia", run: () => searchWikimedia(query, perPage) });

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
    // Every provider erroring is an outage, not an empty result set. Say so, or
    // the UI tells the owner to reword a query that was never the problem.
    return { buckets, providers, degraded: failed === tasks.length };
  }

  // Round-robin interleave so the grid clearly mixes sources (Pexels leads each
  // round for quality), deduped by url.
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

  // A rare dish name plus a bias term can be too narrow: "sekuwa food dish"
  // finds 6 photos where plain "sekuwa" finds 20 good ones. Top up from the
  // unbiased query — but only with results that independently read as food,
  // otherwise "mustang" refills the grid with Ford Mustangs.
  if (merged.length < MIN_RESULTS && sq !== q) {
    const second = await collect(q);
    drain(second.buckets, (img) => FOOD_WORDS.test(img.alt));
    for (const p of second.providers) {
      if (!providersUsed.includes(p)) providersUsed.push(p);
    }
  }

  if (merged.length === 0) {
    return NextResponse.json({ images: [], provider: null, degraded: first.degraded });
  }
  return NextResponse.json(
    { images: merged, provider: providersUsed.join("+"), degraded: first.degraded },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
