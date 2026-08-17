import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMasterAdmin } from "@/lib/require-admin";
import { forbidden } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { parseEmbedUrl } from "@/lib/tutorials";

/**
 * Tutorial video authoring. MASTER_ADMIN only — `requireAdmin()` would also let
 * PLATFORM_STAFF through, and this content is published publicly under the
 * HimaVolt brand.
 */

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().min(1),
  sourceType: z.enum(["UPLOAD", "EMBED"]),
  /** Supabase public URL for UPLOAD, pasted watch link for EMBED. */
  videoUrl: z.string().trim().min(1).max(2000),
  posterUrl: z.string().trim().max(2000).optional().nullable(),
  audience: z.enum(["PUBLIC", "AUTHENTICATED"]).default("PUBLIC"),
  durationSec: z.number().int().positive().max(60 * 60 * 12).optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  originalSize: z.number().int().positive().optional().nullable(),
  mimeType: z.string().trim().max(100).optional().nullable(),
  width: z.number().int().positive().max(10000).optional().nullable(),
  height: z.number().int().positive().max(10000).optional().nullable(),
  isFeatured: z.boolean().default(false),
});

/** GET /api/admin/tutorials — every video, including inactive ones. */
export async function GET() {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const categories = await db.tutorialCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      videos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  return NextResponse.json({ categories });
}

/** POST /api/admin/tutorials — publish a video. */
export async function POST(req: NextRequest) {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const category = await db.tutorialCategory.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json({ error: "That section no longer exists." }, { status: 400 });
  }

  let provider: string | null = null;
  let embedId: string | null = null;
  let videoUrl = data.videoUrl;
  let posterUrl = data.posterUrl ?? null;

  if (data.sourceType === "EMBED") {
    const embed = parseEmbedUrl(data.videoUrl);
    if (!embed) {
      return NextResponse.json(
        { error: "Paste a YouTube or Vimeo link. Other providers are not supported yet." },
        { status: 400 },
      );
    }
    provider = embed.provider;
    embedId = embed.embedId;
    videoUrl = embed.canonicalUrl;
    posterUrl = posterUrl || embed.posterUrl;
  } else {
    // Only ever accept an upload URL that we produced. Storing an arbitrary
    // remote URL here would let the player be pointed at a third-party host.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || !videoUrl.startsWith(`${supabaseUrl}/storage/`)) {
      return NextResponse.json(
        { error: "Uploaded videos must come from the platform upload flow." },
        { status: 400 },
      );
    }
  }

  // Only one featured video drives the post-signup prompt; clear the old one.
  if (data.isFeatured) {
    await db.tutorialVideo.updateMany({
      where: { isFeatured: true },
      data: { isFeatured: false },
    });
  }

  const last = await db.tutorialVideo.findFirst({
    where: { categoryId: data.categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const video = await db.tutorialVideo.create({
    data: {
      title: data.title,
      description: data.description || null,
      categoryId: data.categoryId,
      sourceType: data.sourceType,
      videoUrl,
      posterUrl,
      provider,
      embedId,
      audience: data.audience,
      durationSec: data.durationSec ?? null,
      fileSize: data.fileSize ?? null,
      originalSize: data.originalSize ?? null,
      mimeType: data.mimeType ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      isFeatured: data.isFeatured,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  logAudit({
    action: "TUTORIAL_VIDEO_CREATED",
    entity: "TutorialVideo",
    entityId: video.id,
    detail: video.title,
    metadata: { sourceType: video.sourceType, audience: video.audience },
  });

  return NextResponse.json({ video }, { status: 201 });
}
