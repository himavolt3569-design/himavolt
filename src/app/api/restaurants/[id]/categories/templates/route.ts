import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { getCategoryTemplates, toSlug } from "@/lib/category-templates";

// GET — list this restaurant's category templates (per its type), each flagged
// with whether it has already been added, so the picker can hide/grey out ones
// already on the menu.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const templates = getCategoryTemplates(restaurant.type);
  const existing = await db.menuCategory.findMany({
    where: { restaurantId: id, parentId: null },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((c) => c.slug));

  return NextResponse.json(
    templates.map((t) => ({
      ...t,
      slug: toSlug(t.name),
      added: existingSlugs.has(toSlug(t.name)),
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

// POST — add a single template category with its subcategories. Idempotent:
// re-adding an already-present template only fills in whatever's missing.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;

  if (!authorized) {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
      select: { id: true },
    });
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    authorized = true;
  }

  const restaurantData = await db.restaurant.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!restaurantData) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name: string | undefined = body.name;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const template = getCategoryTemplates(restaurantData.type).find((t) => t.name === name);
  if (!template) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  try {
    const parentSlug = toSlug(template.name);

    // Ensure the parent exists (append after any existing top-level categories).
    let parent = await db.menuCategory.findFirst({
      where: { restaurantId: id, slug: parentSlug, parentId: null },
      select: { id: true },
    });
    if (!parent) {
      const maxSort = await db.menuCategory.aggregate({
        where: { restaurantId: id, parentId: null },
        _max: { sortOrder: true },
      });
      parent = await db.menuCategory.create({
        data: {
          name: template.name,
          slug: parentSlug,
          icon: template.icon,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          restaurantId: id,
        },
        select: { id: true },
      });
    }

    // Create only the subs that don't already exist — one bulk write, guarded
    // by the @@unique([restaurantId, slug]) so a concurrent add can't collide.
    const existingSubs = await db.menuCategory.findMany({
      where: { restaurantId: id, parentId: parent.id },
      select: { slug: true },
    });
    const existingSubSlugs = new Set(existingSubs.map((c) => c.slug));
    const subData = template.subs
      .map((subName, i) => ({
        name: subName,
        slug: `${parentSlug}--${toSlug(subName)}`,
        sortOrder: i + 1,
        restaurantId: id,
        parentId: parent!.id,
      }))
      .filter((s) => !existingSubSlugs.has(s.slug));
    if (subData.length > 0) {
      await db.menuCategory.createMany({ data: subData, skipDuplicates: true });
    }

    const children = await db.menuCategory.findMany({
      where: { parentId: parent.id },
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: "asc" },
    });
    const parentWithCount = await db.menuCategory.findUnique({
      where: { id: parent.id },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ ...parentWithCount, children }, { status: 201 });
  } catch (err) {
    console.error("[Category Template Add]", err);
    return NextResponse.json(
      { error: "Failed to add category", detail: String(err) },
      { status: 500 },
    );
  }
}
