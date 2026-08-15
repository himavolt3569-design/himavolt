import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { readImpersonation } from "@/lib/impersonation";
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
    // `select` matters here beyond tidiness: without it Prisma requests every
    // scalar column, so this existence check breaks the whole signup flow the
    // moment the client knows about a column the database has not got yet.
    const exists = await db.restaurant.findUnique({
      where: { restaurantCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  // Fallback — longer suffix to avoid collision
  return `HH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export const GET = safeHandler(async () => {
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  // A platform admin managing a business resolves as its owner — but the
  // authorisation they were granted, and that was audited, covers exactly ONE
  // restaurant. Returning the owner's whole portfolio would let them switch to
  // a sibling business through the sidebar picker, outside that grant. Scoping
  // the list here also guarantees the dashboard selects the business they
  // actually clicked, rather than whatever `himavolt:selectedRestaurantId` in
  // localStorage happens to hold.
  const impersonation = await readImpersonation();

  const restaurants = await db.restaurant.findMany({
    where: impersonation
      ? { id: impersonation.restaurantId, ownerId: user.id }
      : { ownerId: user.id },
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

    // Seed the default category tree AFTER the response is sent. Seeding is
    // ~10 sequential writes on the small serverless pool — keeping it in the
    // request path was the main reason "create restaurant" felt slow. `after()`
    // runs it in the same invocation once the owner already has their new
    // restaurant, so the create returns instantly. Non-fatal, and the owner
    // reaches Menu → Categories a few seconds later at the earliest, by which
    // point this has finished (empty-Menu auto-seed remains the safety net).
    after(async () => {
      try {
        await seedDefaultCategories(restaurant.id, body.type);
      } catch (err) {
        console.error("[Restaurant Create] category seed failed", err);
      }
    });

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
