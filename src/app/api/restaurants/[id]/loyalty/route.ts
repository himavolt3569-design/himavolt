import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getRestaurantAccess,
  requireOwnerOrStaffManager,
} from "@/lib/access-control";

type Params = { params: Promise<{ id: string }> };

// GET /api/restaurants/[id]/loyalty — get config + top accounts
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await getRestaurantAccess(req, id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [config, rewards, topAccounts] = await Promise.all([
    db.loyaltyConfig.findUnique({ where: { restaurantId: id } }),
    db.loyaltyReward.findMany({
      where: { restaurantId: id },
      orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
    }),
    db.loyaltyAccount.findMany({
      where: { restaurantId: id },
      orderBy: { points: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, email: true, imageUrl: true } },
      },
    }),
  ]);

  return NextResponse.json({ config, rewards, topAccounts });
}

// PUT /api/restaurants/[id]/loyalty — upsert loyalty config
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const access = await requireOwnerOrStaffManager(req, id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { pointsPerCurrency, isActive, welcomeBonus } = body;

  const config = await db.loyaltyConfig.upsert({
    where: { restaurantId: id },
    create: {
      restaurantId: id,
      pointsPerCurrency: pointsPerCurrency ?? 1,
      isActive: isActive ?? true,
      welcomeBonus: welcomeBonus ?? 0,
    },
    update: {
      ...(pointsPerCurrency !== undefined && { pointsPerCurrency }),
      ...(isActive !== undefined && { isActive }),
      ...(welcomeBonus !== undefined && { welcomeBonus }),
    },
  });

  return NextResponse.json(config);
}
