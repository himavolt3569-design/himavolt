import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      restaurantCode: true,
      posEnabled: true,
      posActivatedAt: true,
      posTerminalName: true,
      posOpeningCash: true,
      posWelcomeSeenAt: true,
      posCustomerModeEnabled: true,
      posCustomerExitCombo: true,
      taxRate: true,
      taxEnabled: true,
      serviceChargeRate: true,
      serviceChargeEnabled: true,
      currency: true,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}
