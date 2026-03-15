import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const orders = await db.order.findMany({
    where: { userId: user.id },
    include: {
      items: true,
      payment: {
        select: { method: true, status: true, paidAt: true },
      },
      bill: {
        select: {
          billNo: true,
          subtotal: true,
          tax: true,
          serviceCharge: true,
          discount: true,
          total: true,
        },
      },
      restaurant: {
        select: { name: true, slug: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(orders);
}
