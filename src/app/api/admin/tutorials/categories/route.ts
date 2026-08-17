import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMasterAdmin } from "@/lib/require-admin";
import { forbidden } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { CATEGORY_ICONS, DEFAULT_CATEGORIES, slugify } from "@/lib/tutorials";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.enum(CATEGORY_ICONS).optional().nullable(),
});

/**
 * POST /api/admin/tutorials/categories
 * Creates a section. Passing `{ seed: true }` instead installs the default set
 * — used once, from the empty state of the admin tab.
 */
export async function POST(req: NextRequest) {
  const admin = await requireMasterAdmin();
  if (!admin) return forbidden("Master admin access required");

  const raw = await req.json().catch(() => ({}));

  if (raw?.seed === true) {
    const existing = await db.tutorialCategory.count();
    if (existing > 0) {
      return NextResponse.json({ error: "Sections already exist." }, { status: 400 });
    }
    await db.tutorialCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c, index) => ({
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        sortOrder: index,
      })),
    });
    const categories = await db.tutorialCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { videos: true },
    });
    return NextResponse.json({ categories }, { status: 201 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const base = slugify(parsed.data.name);
  if (!base) {
    return NextResponse.json(
      { error: "Give the section a name with at least one letter or number." },
      { status: 400 },
    );
  }

  // `slug` is unique. Suffix rather than reject, so naming two sections
  // similarly is not a dead end for the admin.
  let slug = base;
  for (let attempt = 2; attempt <= 50; attempt++) {
    const clash = await db.tutorialCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!clash) break;
    slug = `${base}-${attempt}`;
  }

  const last = await db.tutorialCategory.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const category = await db.tutorialCategory.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  logAudit({
    action: "TUTORIAL_CATEGORY_CREATED",
    entity: "TutorialCategory",
    entityId: category.id,
    detail: category.name,
  });

  return NextResponse.json({ category }, { status: 201 });
}
