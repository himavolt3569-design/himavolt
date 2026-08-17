/**
 * Tutorial video domain helpers, shared by the admin authoring UI, the public
 * `/demo` surface, and the API routes.
 *
 * Two source types are supported deliberately (see docs/11-tutorial-videos.md):
 *  - UPLOAD: the file lives in the Supabase bucket, uploaded straight from the
 *    browser through a signed URL. Capped by `MAX_UPLOAD_BYTES`.
 *  - EMBED:  the file lives on YouTube/Vimeo, which gives adaptive bitrate
 *    streaming that self-hosting an MP4 cannot. We store the parsed provider
 *    and id so the player can build its own chrome around the iframe.
 */

/** Supabase/route ceiling for a directly uploaded video. Mirrors /api/upload. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Above this we actively push the admin toward compressing before upload. */
export const COMPRESS_SUGGESTED_BYTES = 24 * 1024 * 1024;

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type TutorialSourceType = "UPLOAD" | "EMBED";
export type TutorialAudienceType = "PUBLIC" | "AUTHENTICATED";

export interface TutorialVideoDTO {
  id: string;
  title: string;
  description: string | null;
  sourceType: TutorialSourceType;
  videoUrl: string;
  posterUrl: string | null;
  provider: string | null;
  embedId: string | null;
  durationSec: number | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  audience: TutorialAudienceType;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  categoryId: string;
  /**
   * Set by the public route when the viewer may see that this video exists but
   * not play it. A locked video arrives with `videoUrl` and `embedId` blanked —
   * the gate is server-side, not a CSS overlay someone can inspect past.
   */
  locked?: boolean;
}

export interface TutorialCategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  videos: TutorialVideoDTO[];
}

/**
 * Icon names the category editor may choose from. Restricted to an allowlist
 * because the value is stored as a free string and resolved to a component on
 * the client — an unbounded name would just render nothing.
 */
export const CATEGORY_ICONS = [
  "PlayCircle",
  "LogIn",
  "UtensilsCrossed",
  "Monitor",
  "ShoppingBag",
  "CreditCard",
  "Users",
  "Settings",
  "BedDouble",
  "Truck",
  "BarChart3",
  "Sparkles",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

/**
 * The starter set created on first load of the admin tab, so the section is
 * never an empty void. Mirrors the flows the product actually has.
 */
export const DEFAULT_CATEGORIES: {
  name: string;
  slug: string;
  description: string;
  icon: CategoryIconName;
}[] = [
  {
    name: "Getting Started",
    slug: "getting-started",
    description: "Create your account, sign in, and set up your restaurant.",
    icon: "LogIn",
  },
  {
    name: "Menu & Dishes",
    slug: "menu-and-dishes",
    description: "Add dishes, categories, sizes, add-ons and photos.",
    icon: "UtensilsCrossed",
  },
  {
    name: "Using the POS",
    slug: "using-the-pos",
    description: "Take orders, run tables, split bills and print receipts.",
    icon: "Monitor",
  },
  {
    name: "Orders & Kitchen",
    slug: "orders-and-kitchen",
    description: "Accept orders, drive the kitchen board, and track delivery.",
    icon: "ShoppingBag",
  },
  {
    name: "Payments & Billing",
    slug: "payments-and-billing",
    description: "eSewa, Khalti, bank transfer, coupons and daily settlement.",
    icon: "CreditCard",
  },
  {
    name: "Staff & Roles",
    slug: "staff-and-roles",
    description: "Add staff, set PINs, assign roles and manage shifts.",
    icon: "Users",
  },
];

export interface ParsedEmbed {
  provider: "youtube" | "vimeo";
  embedId: string;
  /** Canonical watch URL, stored as `videoUrl`. */
  canonicalUrl: string;
  /** Sandboxed iframe src used by the player. */
  embedUrl: string;
  /** Best-effort provider thumbnail, used when no poster is uploaded. */
  posterUrl: string | null;
}

/**
 * Parse a pasted YouTube or Vimeo link into the pieces the player needs.
 * Returns null for anything unrecognised — callers surface that as a
 * validation error rather than storing an un-embeddable URL.
 */
export function parseEmbedUrl(raw: string): ParsedEmbed | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  // ── YouTube ────────────────────────────────────────────────────────────
  // youtu.be/<id> | youtube.com/watch?v=<id> | /embed/<id> | /shorts/<id>
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? youtube(id) : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return youtube(v);

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 2 && ["embed", "shorts", "live", "v"].includes(segments[0])) {
      return youtube(segments[1]);
    }
    return null;
  }

  // ── Vimeo ──────────────────────────────────────────────────────────────
  // vimeo.com/<id> | player.vimeo.com/video/<id>
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments.find((s) => /^\d+$/.test(s));
    if (!id) return null;
    return {
      provider: "vimeo",
      embedId: id,
      canonicalUrl: `https://vimeo.com/${id}`,
      // dnt=1 keeps Vimeo from setting tracking cookies on our visitors.
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0`,
      posterUrl: null,
    };
  }

  return null;
}

function youtube(rawId: string): ParsedEmbed | null {
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return null;
  return {
    provider: "youtube",
    embedId: id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    // youtube-nocookie + modestbranding keeps the chrome as close to ours as
    // the provider allows. rel=0 stops unrelated channels being suggested.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
    posterUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  };
}

/** Rebuild the iframe src from stored columns, without re-parsing the URL. */
export function embedSrcFor(
  provider: string | null,
  embedId: string | null,
): string | null {
  if (!provider || !embedId) return null;
  if (provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${embedId}?rel=0&modestbranding=1&playsinline=1`;
  }
  if (provider === "vimeo") {
    return `https://player.vimeo.com/video/${embedId}?dnt=1&title=0&byline=0&portrait=0`;
  }
  return null;
}

/** `754` -> `12:34`. Returns null when duration is unknown. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** `18874368` -> `18.0 MB`. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** Slugify a category name into a URL-safe, unique-ish key. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
