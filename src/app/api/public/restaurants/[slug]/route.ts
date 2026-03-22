import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, parentId: true, icon: true },
      },
      paymentQRs: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, imageUrl: true },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return safe response with defaults for new fields that may not exist yet
  const r = restaurant as Record<string, unknown>;
  return NextResponse.json({
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    phone: restaurant.phone,
    type: restaurant.type,
    address: restaurant.address,
    city: restaurant.city,
    imageUrl: restaurant.imageUrl,
    coverUrl: restaurant.coverUrl,
    rating: restaurant.rating,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    tableCount: restaurant.tableCount,
    roomCount: r.roomCount ?? 0,
    wifiName: restaurant.wifiName,
    wifiPassword: restaurant.wifiPassword,
    currency: restaurant.currency,
    taxRate: restaurant.taxRate,
    taxEnabled: restaurant.taxEnabled,
    serviceChargeRate: r.serviceChargeRate ?? 0,
    serviceChargeEnabled: r.serviceChargeEnabled ?? false,
    counterPayEnabled: r.counterPayEnabled ?? true,
    directPayEnabled: r.directPayEnabled ?? false,
    prepaidEnabled: r.prepaidEnabled ?? false,
    categories: restaurant.categories,
    paymentQRs: restaurant.paymentQRs,
  });
}
