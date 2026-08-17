import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMasterAdmin } from "@/lib/require-admin";
import { forbidden, notFound } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    categoryId: z.string().min(1).optional(),
    audience: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    posterUrl: z.string().trim().max(2000).nullable().optional(),

    // Media replacement. The editor can swap the file (or switch an upload to
    // an embed and back), which means every field describing the media has to
    // be replaceable too — otherwise a new file inherits the old duration,
    // size and dimensions and the player renders against stale numbers.
    sourceType: z.enum(["UPLOAD", "EMBED"]).optional(),
    videoUrl: z.string().trim().min(1).max(2000).optional(),
    provider: z.string().trim().max(40).nullable().optional(),
    embedId: z.string().trim().max(120).nullable().optional(),
    durationSec: z.number().int().min(0).max(86_400).nullable().optional(),
    fileSize: z.number().int().min(0).nullable().optional(),
    originalSize: z.number().int().min(0).nullable().optional(),
    mimeType: z.string().trim().max(120).nullable().optional(),
    width: z.number().int().min(0).max(10_000).nullable().optional(),
    height: z.number().int().min(0).max(10_000).nullable().optional(),
  })
  .refine((v) => v.sourceType == null || v.videoUrl != null, {
    message: "Changing the source type requires the new video URL.",
    path: ["videoUrl"],
  });

/** PATCH /api/admin/tutorials/[id] */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const { id } = await ctx.params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await db.tutorialVideo.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) return notFound("That video no longer exists.");

  if (data.categoryId) {
    const category = await db.tutorialCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "That section no longer exists." }, { status: 400 });
    }
  }

  // Featuring this one un-features whatever held it before.
  if (data.isFeatured === true) {
    await db.tutorialVideo.updateMany({
      where: { isFeatured: true, NOT: { id } },
      data: { isFeatured: false },
    });
  }

  const video = await db.tutorialVideo.update({
    where: { id },
    data,
  });

  logAudit({
    action: "TUTORIAL_VIDEO_UPDATED",
    entity: "TutorialVideo",
    entityId: id,
    detail: video.title,
    metadata: { changed: Object.keys(data) },
  });

  return NextResponse.json({ video });
}

/** DELETE /api/admin/tutorials/[id] */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const { id } = await ctx.params;

  const existing = await db.tutorialVideo.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) return notFound("That video no longer exists.");

  await db.tutorialVideo.delete({ where: { id } });

  // The stored object in Supabase is intentionally left in place: deleting it
  // here would strand any other row that happens to reference the same URL, and
  // orphaned objects are cheap next to an accidental broken video.
  logAudit({
    action: "TUTORIAL_VIDEO_DELETED",
    entity: "TutorialVideo",
    entityId: id,
    detail: existing.title,
  });

  return NextResponse.json({ ok: true });
}
