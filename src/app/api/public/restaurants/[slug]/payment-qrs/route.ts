import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: encodedSlug } = await params;
  const slug = decodeURIComponent(encodedSlug);

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const qrs = await db.paymentQR.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    select: { id: true, label: true, imageUrl: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(qrs);
}
