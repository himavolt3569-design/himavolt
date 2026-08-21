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
  const { name, description, imageUrl, comboPrice, originalPrice, items, choiceGroups } = body;

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
        create: (items ?? []).map((item: { name: string; quantity: number; price?: number; imageUrl?: string; menuItemId?: string }) => ({
          name: item.name,
          quantity: item.quantity ?? 1,
          price: item.price ? Number(item.price) : 0,
          imageUrl: item.imageUrl ?? null,
          menuItemId: item.menuItemId ?? null,
        })),
      },
      choiceGroups: {
        create: (choiceGroups ?? []).map((cg: { name: string; maxSelect?: number; options?: { name: string; price?: number; imageUrl?: string }[] }) => ({
          name: cg.name,
          maxSelect: cg.maxSelect ?? 1,
          options: {
            create: (cg.options ?? []).map(opt => ({
              name: opt.name,
              price: opt.price ? Number(opt.price) : 0,
              imageUrl: opt.imageUrl ?? null,
            })),
          },
        })),
      },
    },
    include: {
      items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true, price: true } } } },
      choiceGroups: { include: { options: true } },
    },
  });
  return NextResponse.json(combo, { status: 201 });
}
