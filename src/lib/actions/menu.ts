"use server";

import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCategory(restaurantId: string, name: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const maxSort = await db.menuCategory.aggregate({
    where: { restaurantId },
    _max: { sortOrder: true },
  });

  const category = await db.menuCategory.create({
    data: {
      name,
      slug,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      restaurantId,
    },
  });

  revalidatePath("/dashboard");
  return category;
}

export async function createMenuItem(
  restaurantId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    prepTime?: string;
    isVeg?: boolean;
    hasEgg?: boolean;
    hasOnionGarlic?: boolean;
    badge?: string;
    tags?: string[];
    categoryId: string;
    sizes?: { label: string; grams: string; priceAdd: number }[];
    addOns?: { name: string; price: number }[];
  }
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const item = await db.menuItem.create({
    data: {
      name: data.name,
      description: data.description || "",
      price: data.price,
      imageUrl: data.imageUrl,
      prepTime: data.prepTime || "15-20 min",
      isVeg: data.isVeg ?? false,
      hasEgg: data.hasEgg ?? false,
      hasOnionGarlic: data.hasOnionGarlic ?? true,
      badge: data.badge,
      tags: data.tags || [],
      restaurantId,
      categoryId: data.categoryId,
      sizes: data.sizes?.length
        ? { createMany: { data: data.sizes } }
        : undefined,
      addOns: data.addOns?.length
        ? { createMany: { data: data.addOns } }
        : undefined,
    },
    include: { sizes: true, addOns: true },
  });

  revalidatePath("/dashboard");
  return item;
}

export async function updateMenuItem(
  itemId: string,
  data: Record<string, unknown>
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const item = await db.menuItem.update({
    where: { id: itemId },
    data,
    include: { sizes: true, addOns: true },
  });

  revalidatePath("/dashboard");
  return item;
}

export async function deleteMenuItem(itemId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  await db.menuItem.delete({ where: { id: itemId } });
  revalidatePath("/dashboard");
}

export async function toggleItemAvailability(itemId: string) {
  const item = await db.menuItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Not found");

  return db.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: !item.isAvailable },
  });
}
