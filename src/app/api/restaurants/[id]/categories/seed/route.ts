import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import {
  CATEGORIES_BY_TYPE,
  DEFAULT_CATEGORIES,
  toSlug,
} from "@/lib/category-templates";

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
      select: { id: true, type: true },
    });
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    authorized = true;
  }

  const restaurantData = await db.restaurant.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!restaurantData) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const templates = CATEGORIES_BY_TYPE[restaurantData.type] ?? DEFAULT_CATEGORIES;

  try {
    // Create-if-not-exists (by slug) so existing categories and their menu
    // items are never touched — running this repeatedly is idempotent.
    //
    // This used to run a findFirst + create per category AND per subcategory
    // (~120 sequential round-trips for a 10-category template), which made the
    // "Generate Categories" button spin for seconds on the serverless pool.
    // It's now a fixed ~4 queries: one read of what already exists, one
    // createMany for the missing parents, one read to map parent slug → id,
    // and one createMany for the missing subs. `skipDuplicates` leans on the
    // @@unique([restaurantId, slug]) constraint so concurrent seeds can't
    // collide.
    const existing = await db.menuCategory.findMany({
      where: { restaurantId: id },
      select: { slug: true, parentId: true, sortOrder: true },
    });
    const existingSlugs = new Set(existing.map((c) => c.slug));
    const maxParentSort = existing.reduce(
      (max, c) => (c.parentId === null && c.sortOrder > max ? c.sortOrder : max),
      0,
    );

    // 1) Insert any missing top-level categories in one write.
    let nextSort = maxParentSort + 1;
    const newParentSlugs = new Set<string>();
    const parentData: {
      name: string;
      slug: string;
      icon: string;
      sortOrder: number;
      restaurantId: string;
    }[] = [];
    for (const cat of templates) {
      const parentSlug = toSlug(cat.name);
      if (existingSlugs.has(parentSlug)) continue;
      newParentSlugs.add(parentSlug);
      parentData.push({
        name: cat.name,
        slug: parentSlug,
        icon: cat.icon,
        sortOrder: nextSort++,
        restaurantId: id,
      });
    }
    if (parentData.length > 0) {
      await db.menuCategory.createMany({ data: parentData, skipDuplicates: true });
    }

    // 2) Map every template parent slug → id (existing + just-created).
    const parentSlugs = templates.map((cat) => toSlug(cat.name));
    const parents = await db.menuCategory.findMany({
      where: { restaurantId: id, parentId: null, slug: { in: parentSlugs } },
      select: { id: true, slug: true },
    });
    const parentIdBySlug = new Map(parents.map((p) => [p.slug, p.id]));

    // 3) Insert any missing subcategories in one write, and build the summary.
    const created: { name: string; subs: string[] }[] = [];
    const subData: {
      name: string;
      slug: string;
      sortOrder: number;
      restaurantId: string;
      parentId: string;
    }[] = [];
    for (const cat of templates) {
      const parentSlug = toSlug(cat.name);
      const parentId = parentIdBySlug.get(parentSlug);
      if (!parentId) continue; // parent creation raced/failed — skip its subs

      const newSubs: string[] = [];
      let subSort = 1;
      for (const subName of cat.subs) {
        const subSlug = `${parentSlug}--${toSlug(subName)}`;
        if (existingSlugs.has(subSlug)) continue;
        subData.push({
          name: subName,
          slug: subSlug,
          sortOrder: subSort++,
          restaurantId: id,
          parentId,
        });
        newSubs.push(subName);
      }

      if (newParentSlugs.has(parentSlug) || newSubs.length > 0) {
        created.push({ name: cat.name, subs: newSubs });
      }
    }
    if (subData.length > 0) {
      await db.menuCategory.createMany({ data: subData, skipDuplicates: true });
    }

    return NextResponse.json({
      message: created.length > 0
        ? `Added ${created.length} new categories for ${restaurantData.type}`
        : `All categories already exist for ${restaurantData.type}`,
      categories: created,
    });
  } catch (err) {
    console.error("[Categories Seed]", err);
    return NextResponse.json(
      { error: "Failed to seed", detail: String(err) },
      { status: 500 },
    );
  }
}
