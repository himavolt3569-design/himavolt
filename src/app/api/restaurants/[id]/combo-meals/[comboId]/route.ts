import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

async function assertAccess(req: NextRequest, restaurantId: string) {
  const staff = await getStaffSession(req);
  if (staff?.restaurantId === restaurantId) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const r = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!r;
}

// PATCH /api/restaurants/[id]/combo-meals/[comboId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; comboId: string }> },
) {
  const { id, comboId } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, imageUrl, comboPrice, originalPrice, isActive, items } = body;

  // Replace items if provided
  const updated = await db.comboMeal.update({
    where: { id: comboId, restaurantId: id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(comboPrice !== undefined && { comboPrice: Number(comboPrice) }),
      ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
      ...(isActive !== undefined && { isActive }),
      ...(items !== undefined && {
        items: {
          deleteMany: {},
          create: items.map((item: { name: string; quantity: number; menuItemId?: string }) => ({
            name: item.name,
            quantity: item.quantity ?? 1,
            menuItemId: item.menuItemId ?? null,
          })),
        },
      }),
    },
    include: { items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true, price: true } } } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/restaurants/[id]/combo-meals/[comboId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; comboId: string }> },
) {
  const { id, comboId } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.comboMeal.delete({ where: { id: comboId, restaurantId: id } });
  return NextResponse.json({ success: true });
}
