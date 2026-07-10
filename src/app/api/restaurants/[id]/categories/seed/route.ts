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
    // Use create-if-not-exists (by slug) so existing categories and their
    // menu items are never touched. Running this multiple times is idempotent.
    const created: { name: string; subs: string[] }[] = [];

    // Get the current max sortOrder among top-level categories so new ones
    // are appended rather than placed at position 1.
    const maxSort = await db.menuCategory.aggregate({
      where: { restaurantId: id, parentId: null },
      _max: { sortOrder: true },
    });
    let nextSort = (maxSort._max.sortOrder ?? 0) + 1;

    for (const cat of templates) {
      const parentSlug = toSlug(cat.name);

      const existingParent = await db.menuCategory.findFirst({
        where: { restaurantId: id, slug: parentSlug, parentId: null },
      });

      let parentId: string;
      let isNewParent = false;

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        const parent = await db.menuCategory.create({
          data: {
            name: cat.name,
            slug: parentSlug,
            icon: cat.icon,
            sortOrder: nextSort++,
            restaurantId: id,
          },
        });
        parentId = parent.id;
        isNewParent = true;
      }

      const newSubs: string[] = [];
      let subSort = 1;
      for (const subName of cat.subs) {
        const subSlug = `${parentSlug}--${toSlug(subName)}`;
        const existingSub = await db.menuCategory.findFirst({
          where: { restaurantId: id, slug: subSlug },
        });
        if (!existingSub) {
          await db.menuCategory.create({
            data: {
              name: subName,
              slug: subSlug,
              sortOrder: subSort++,
              restaurantId: id,
              parentId,
            },
          });
          newSubs.push(subName);
        }
      }

      if (isNewParent || newSubs.length > 0) {
        created.push({ name: cat.name, subs: newSubs });
      }
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
