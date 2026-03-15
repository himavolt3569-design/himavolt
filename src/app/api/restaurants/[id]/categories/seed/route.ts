import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

const DEFAULT_CATEGORIES = [
  { name: "Appetizers", icon: "🍢", subs: ["Fried", "Grilled", "Cold"] },
  { name: "Momo", icon: "🥟", subs: ["Steam", "Fried", "Jhol", "Chilli", "Kothey", "C.Momo", "Tandoori"] },
  { name: "Curry", icon: "🍛", subs: ["Chicken", "Mutton", "Paneer", "Vegetable", "Fish", "Dal"] },
  { name: "Rice & Noodles", icon: "🍜", subs: ["Fried Rice", "Biryani", "Chow Mein", "Thukpa", "Pulao"] },
  { name: "Thali Sets", icon: "🍽️", subs: ["Veg Thali", "Non-Veg Thali", "Special Thali"] },
  { name: "Tandoori", icon: "🔥", subs: ["Chicken", "Paneer", "Fish", "Kebab"] },
  { name: "Breads", icon: "🫓", subs: ["Naan", "Roti", "Paratha", "Kulcha"] },
  { name: "Soups & Salads", icon: "🥗", subs: ["Soups", "Salads"] },
  { name: "Beverages", icon: "🥤", subs: ["Hot", "Cold", "Juices", "Lassi", "Mocktails"] },
  { name: "Desserts", icon: "🍮", subs: ["Indian", "Western", "Ice Cream"] },
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Delete existing categories first (clean slate)
    await db.menuCategory.deleteMany({ where: { restaurantId: id } });

    let sortOrder = 1;
    const created: { name: string; subs: string[] }[] = [];

    for (const cat of DEFAULT_CATEGORIES) {
      const parentSlug = toSlug(cat.name);
      const parent = await db.menuCategory.create({
        data: {
          name: cat.name,
          slug: parentSlug,
          icon: cat.icon,
          sortOrder: sortOrder++,
          restaurantId: id,
        },
      });

      let subSort = 1;
      for (const subName of cat.subs) {
        await db.menuCategory.create({
          data: {
            name: subName,
            slug: `${parentSlug}--${toSlug(subName)}`,
            sortOrder: subSort++,
            restaurantId: id,
            parentId: parent.id,
          },
        });
      }

      created.push({ name: cat.name, subs: cat.subs });
    }

    return NextResponse.json({
      message: `Created ${created.length} categories with subcategories`,
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
