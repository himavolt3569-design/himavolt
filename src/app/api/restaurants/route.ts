import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createRestaurantSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export const GET = safeHandler(async () => {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const restaurants = await db.restaurant.findMany({
    where: { ownerId: user.id },
    include: {
      staff: { include: { user: true } },
      _count: { select: { orders: true, menuItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(restaurants);
});

export const POST = safeHandler(
  async (_req, { body }) => {
    const user = await getOrCreateUser();
    if (!user) return unauthorized();

    const slug =
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString(36);

    if (user.role === "CUSTOMER") {
      await db.user.update({
        where: { id: user.id },
        data: { role: "OWNER" },
      });
    }

    const restaurant = await db.restaurant.create({
      data: {
        name: body.name,
        slug,
        phone: body.phone,
        countryCode: body.countryCode,
        type: body.type,
        address: body.address,
        city: body.city,
        ownerId: user.id,
      },
      include: {
        staff: { include: { user: true } },
        _count: { select: { orders: true, menuItems: true } },
      },
    });

    logAudit({
      action: "RESTAURANT_CREATED",
      entity: "Restaurant",
      entityId: restaurant.id,
      detail: `Restaurant "${body.name}" created`,
      metadata: { name: body.name, type: body.type, city: body.city },
      userId: user.id,
      restaurantId: restaurant.id,
    });

    return NextResponse.json(restaurant, { status: 201 });
  },
  { schema: createRestaurantSchema },
);
