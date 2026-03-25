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

// GET  /api/restaurants/[id]/combo-meals
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const combos = await db.comboMeal.findMany({
    where: { restaurantId: id },
    include: { items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true, price: true } } } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(combos);
}

// POST /api/restaurants/[id]/combo-meals
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertAccess(req, id)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, imageUrl, comboPrice, originalPrice, items } = body;

  if (!name || !comboPrice || !originalPrice)
    return NextResponse.json({ error: "name, comboPrice, originalPrice required" }, { status: 400 });

  const combo = await db.comboMeal.create({
    data: {
      restaurantId: id,
      name: name.trim(),
      description: description?.trim() ?? null,
      imageUrl: imageUrl ?? null,
      comboPrice: Number(comboPrice),
      originalPrice: Number(originalPrice),
      items: {
        create: (items ?? []).map((item: { name: string; quantity: number; menuItemId?: string }) => ({
          name: item.name,
          quantity: item.quantity ?? 1,
          menuItemId: item.menuItemId ?? null,
        })),
      },
    },
    include: { items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true, price: true } } } } },
  });
  return NextResponse.json(combo, { status: 201 });
}
