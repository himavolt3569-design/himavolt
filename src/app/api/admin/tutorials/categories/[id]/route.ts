import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMasterAdmin } from "@/lib/require-admin";
import { forbidden, notFound } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { CATEGORY_ICONS } from "@/lib/tutorials";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.enum(CATEGORY_ICONS).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/tutorials/categories/[id] */
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

  const existing = await db.tutorialCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return notFound("That section no longer exists.");

  const category = await db.tutorialCategory.update({
    where: { id },
    data: parsed.data,
  });

  logAudit({
    action: "TUTORIAL_CATEGORY_UPDATED",
    entity: "TutorialCategory",
    entityId: id,
    detail: category.name,
  });

  return NextResponse.json({ category });
}

/**
 * DELETE /api/admin/tutorials/categories/[id]
 *
 * Refuses while the section still holds videos. The schema cascades, so a blind
 * delete here would silently take every video in the section with it.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const { id } = await ctx.params;

  const existing = await db.tutorialCategory.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { videos: true } } },
  });
  if (!existing) return notFound("That section no longer exists.");

  if (existing._count.videos > 0) {
    return NextResponse.json(
      {
        error: `"${existing.name}" still has ${existing._count.videos} video${
          existing._count.videos === 1 ? "" : "s"
        }. Move or delete them first.`,
      },
      { status: 409 },
    );
  }

  await db.tutorialCategory.delete({ where: { id } });

  logAudit({
    action: "TUTORIAL_CATEGORY_DELETED",
    entity: "TutorialCategory",
    entityId: id,
    detail: existing.name,
  });

  return NextResponse.json({ ok: true });
}
