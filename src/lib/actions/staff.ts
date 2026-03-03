"use server";

import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { StaffRole } from "@/generated/prisma";

export async function addStaffMember(
  restaurantId: string,
  data: { name: string; email: string; phone?: string; role: StaffRole; pin: string }
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  if (!restaurant) throw new Error("Forbidden");

  let staffUser = await db.user.findUnique({ where: { email: data.email } });
  if (!staffUser) {
    staffUser = await db.user.create({
      data: {
        id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email: data.email,
        name: data.name,
        phone: data.phone,
      },
    });
  }

  const member = await db.staffMember.create({
    data: {
      pin: data.pin,
      role: data.role,
      userId: staffUser.id,
      restaurantId,
    },
    include: {
      user: { select: { name: true, email: true, phone: true, imageUrl: true } },
    },
  });

  revalidatePath("/dashboard");
  return member;
}

export async function removeStaffMember(
  restaurantId: string,
  staffId: string
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
  });
  if (!restaurant) throw new Error("Forbidden");

  await db.staffMember.delete({ where: { id: staffId } });

  revalidatePath("/dashboard");
}

export async function toggleStaffActive(
  restaurantId: string,
  staffId: string
) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const member = await db.staffMember.findUnique({ where: { id: staffId } });
  if (!member) throw new Error("Not found");

  const updated = await db.staffMember.update({
    where: { id: staffId },
    data: { isActive: !member.isActive },
    include: {
      user: { select: { name: true, email: true, phone: true, imageUrl: true } },
    },
  });

  revalidatePath("/dashboard");
  return updated;
}
