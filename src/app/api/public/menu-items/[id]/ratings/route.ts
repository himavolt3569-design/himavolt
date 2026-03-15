import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get average and count
    const aggregate = await db.menuItemRating.aggregate({
      where: { menuItemId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Get recent ratings with user name
    const ratings = await db.menuItemRating.findMany({
      where: { menuItemId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, imageUrl: true } },
      },
    });

    return NextResponse.json({
      average: aggregate._avg.rating || 0,
      count: aggregate._count.rating,
      ratings,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
