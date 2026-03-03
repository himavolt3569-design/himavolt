import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: id },
    include: { _count: { select: { items: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(
  req: NextRequest,
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

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const maxSort = await db.menuCategory.aggregate({
    where: { restaurantId: id },
    _max: { sortOrder: true },
  });

  const category = await db.menuCategory.create({
    data: {
      name,
      slug,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      restaurantId: id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
