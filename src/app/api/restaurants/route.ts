import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createRestaurantSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { isValidNepalMobile, normalizeNepalPhone } from "@/lib/phone";
import { seedDefaultCategories } from "@/lib/category-templates";
import crypto from "crypto";

const staffSelect = {
  id: true,
  role: true,
  staffType: true,
  isActive: true,
  createdAt: true,
  userId: true,
  restaurantId: true,
  qrToken: true,
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
      imageUrl: true,
    },
  },
} as const;

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `HH-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const exists = await db.restaurant.findUnique({
      where: { restaurantCode: code },
    });
    if (!exists) return code;
  }
  // Fallback — longer suffix to avoid collision
  return `HH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export const GET = safeHandler(async () => {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const restaurants = await db.restaurant.findMany({
    where: { ownerId: user.id },
    include: {
      staff: { select: staffSelect },
      _count: { select: { orders: true, menuItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Backfill: only runs for legacy rows missing a restaurantCode (fast-path
  // skips when all rows already have codes). Sequential, NOT Promise.all — on
  // the 1-3 connection pool, firing these in parallel only queues them behind
  // each other and risks pool contention on the app's most-loaded route.
  const missing = restaurants.filter((r) => !r.restaurantCode);
  for (const r of missing) {
    const code = await generateUniqueCode();
    await db.restaurant.update({
      where: { id: r.id },
      data: { restaurantCode: code },
    });
    r.restaurantCode = code;
  }

  return NextResponse.json(restaurants);
});

export const POST = safeHandler(
  async (_req, { body }) => {
    const user = await getOrCreateUser();
    if (!user) return unauthorized();

    const accountPhone = normalizeNepalPhone(user.phone);
    if (isValidNepalMobile(accountPhone) && accountPhone !== body.phone) {
      return NextResponse.json(
        {
          error:
            "Use the phone number attached to your account, or update your account phone first.",
        },
        { status: 400 },
      );
    }

    const slug =
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString(36);

    const restaurantCode = await generateUniqueCode();

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
        latitude: body.latitude,
        longitude: body.longitude,
        ownerId: user.id,
        restaurantCode,
        posWelcomeSeenAt: new Date(),
      },
      include: {
        staff: { select: staffSelect },
        _count: { select: { orders: true, menuItems: true } },
      },
    });

    // Seed the default category tree for the chosen type inline, so the owner
    // sees a fully-populated Categories tab the moment they open Menu — no
    // client-side round-trip, no empty-state race. Non-fatal: a seed failure
    // must not fail restaurant creation (the owner can re-seed from Menu).
    try {
      await seedDefaultCategories(restaurant.id, body.type);
    } catch (err) {
      console.error("[Restaurant Create] category seed failed", err);
    }

    logAudit({
      action: "RESTAURANT_CREATED",
      entity: "Restaurant",
      entityId: restaurant.id,
      detail: `Restaurant "${body.name}" created`,
      metadata: {
        name: body.name,
        type: body.type,
        city: body.city,
        latitude: body.latitude,
        longitude: body.longitude,
      },
      userId: user.id,
      restaurantId: restaurant.id,
    });

    return NextResponse.json(restaurant, { status: 201 });
  },
  { schema: createRestaurantSchema },
);
