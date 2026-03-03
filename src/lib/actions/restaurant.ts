"use server";

import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { RestaurantType } from "@/generated/prisma";

export async function createRestaurant(formData: {
  name: string;
  phone: string;
  countryCode?: string;
  type: RestaurantType;
  address?: string;
  city?: string;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const slug =
    formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

  if (user.role === "CUSTOMER") {
    await db.user.update({
      where: { id: user.id },
      data: { role: "OWNER" },
    });
  }

  const restaurant = await db.restaurant.create({
    data: {
      name: formData.name,
      slug,
      phone: formData.phone,
      countryCode: formData.countryCode || "+977",
      type: formData.type,
      address: formData.address || "",
      city: formData.city || "Kathmandu",
      ownerId: user.id,
    },
  });

  revalidatePath("/manage-restaurants");
  return restaurant;
}

export async function updateRestaurant(
  id: string,
  data: Record<string, unknown>
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!existing) throw new Error("Not found");

  const restaurant = await db.restaurant.update({
    where: { id },
    data,
  });

  revalidatePath("/manage-restaurants");
  revalidatePath(`/dashboard`);
  return restaurant;
}

export async function deleteRestaurant(id: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  await db.restaurant.delete({
    where: { id },
  });

  revalidatePath("/manage-restaurants");
}

export async function getMyRestaurants() {
  const user = await getOrCreateUser();
  if (!user) return [];

  return db.restaurant.findMany({
    where: { ownerId: user.id },
    include: {
      staff: { include: { user: { select: { name: true, email: true, phone: true } } } },
      _count: { select: { orders: true, menuItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
