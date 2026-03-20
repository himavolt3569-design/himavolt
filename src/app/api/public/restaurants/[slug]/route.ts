import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      type: true,
      address: true,
      city: true,
      imageUrl: true,
      coverUrl: true,
      rating: true,
      openingTime: true,
      closingTime: true,
      tableCount: true,
      roomCount: true,
      wifiName: true,
      wifiPassword: true,
      currency: true,
      taxRate: true,
      taxEnabled: true,
      serviceChargeRate: true,
      serviceChargeEnabled: true,
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, parentId: true, icon: true },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}
