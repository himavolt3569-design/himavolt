import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin read/write of a single business's own record — the identity an
 * owner can otherwise only fix themselves. This is what makes a wrong
 * restaurant name, a wrong logo or a wrong address correctable by support.
 */

/** Every column the console is allowed to write, with how to coerce it. Fields
 *  absent from this map are never writable through the admin console, however
 *  they are spelled in the request body. */
const STRING_FIELDS = [
  "name",
  "phone",
  "countryCode",
  "address",
  "city",
  "timezone",
  "openingTime",
  "closingTime",
  "wifiName",
  "wifiPassword",
  "posTerminalName",
  "footerText",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "fontFamily",
  "menuLayout",
  "hotelAdvanceType",
] as const;

/** Nullable URL/text columns — an empty string clears them rather than storing "". */
const NULLABLE_STRING_FIELDS = ["imageUrl", "coverUrl"] as const;

const BOOLEAN_FIELDS = [
  "isActive",
  "isOpen",
  "taxEnabled",
  "serviceChargeEnabled",
  "counterPayEnabled",
  "directPayEnabled",
  "prepaidEnabled",
  "roomServiceEnabled",
  "showStories",
  "showReviews",
] as const;

const NUMBER_FIELDS: Record<
  string,
  { min: number; max: number; int?: boolean; nullable?: boolean }
> = {
  taxRate: { min: 0, max: 100 },
  serviceChargeRate: { min: 0, max: 100 },
  tableCount: { min: 0, max: 10_000, int: true },
  roomCount: { min: 0, max: 10_000, int: true },
  // The only nullable numbers. `Number(null)` is 0, which is a valid latitude —
  // so without the nullable branch below, clearing a coordinate would silently
  // pin the venue at 0,0 instead of unsetting it.
  latitude: { min: -90, max: 90, nullable: true },
  longitude: { min: -180, max: 180, nullable: true },
  hotelAdvanceValue: { min: 0, max: 1_000_000 },
  roomServiceCharge: { min: 0, max: 1_000_000 },
  printCounterWidth: { min: 40, max: 120, int: true },
  printKitchenWidth: { min: 40, max: 120, int: true },
};

const RESTAURANT_TYPES = [
  "RESTAURANT",
  "FAST_FOOD",
  "CAFE",
  "BAR",
  "HOTEL",
  "RESORT",
  "BAKERY",
  "CLOUD_KITCHEN",
  "MO_MO_SHOP",
  "TANDOORI",
  "GUEST_HOUSE",
];

const CURRENCIES = ["NPR", "INR", "USD"];

/** Slugs are the public URL of the business (/menu/<slug>) and are unique. */
function normaliseSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, phone: true, imageUrl: true },
      },
      _count: {
        select: {
          orders: true,
          staff: true,
          menuItems: true,
          categories: true,
          reviews: true,
          tables: true,
          rooms: true,
        },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string") {
      return NextResponse.json({ error: `${key} must be text` }, { status: 400 });
    }
    const value = body[key].trim();
    if (value.length > 500) {
      return NextResponse.json({ error: `${key} is too long` }, { status: 400 });
    }
    data[key] = value;
  }

  for (const key of NULLABLE_STRING_FIELDS) {
    if (body[key] === undefined) continue;
    if (body[key] === null || body[key] === "") {
      data[key] = null;
      continue;
    }
    if (typeof body[key] !== "string" || body[key].length > 1000) {
      return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
    }
    data[key] = body[key];
  }

  for (const key of BOOLEAN_FIELDS) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }

  for (const [key, rule] of Object.entries(NUMBER_FIELDS)) {
    if (body[key] === undefined) continue;
    if (rule.nullable && (body[key] === null || body[key] === "")) {
      data[key] = null;
      continue;
    }
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < rule.min || n > rule.max) {
      return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
    }
    data[key] = rule.int ? Math.round(n) : n;
  }

  // `name` is the headline reason this route exists — reject a blank one rather
  // than letting support wipe a business's identity with a stray save.
  if (data.name !== undefined && !String(data.name)) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  if (body.type !== undefined) {
    if (!RESTAURANT_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Unknown business type" }, { status: 400 });
    }
    data.type = body.type;
  }

  if (body.currency !== undefined) {
    if (!CURRENCIES.includes(body.currency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }
    data.currency = body.currency;
  }

  // Changing the slug changes every public link and every printed QR code that
  // points at this business, so it is deliberately explicit and checked for
  // collisions up front instead of surfacing as a P2002 further down.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const slug = normaliseSlug(body.slug);
    if (!slug) {
      return NextResponse.json(
        { error: "Slug must contain at least one letter or number" },
        { status: 400 },
      );
    }
    if (slug !== guard.restaurant.slug) {
      const taken = await db.restaurant.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: `The link "${slug}" is already used by another business` },
          { status: 409 },
        );
      }
      data.slug = slug;
    }
  }

  // Reassigning ownership is how a business is handed to the right account when
  // it was created under the wrong one. The target must be a real user.
  if (typeof body.ownerId === "string" && body.ownerId !== guard.restaurant.ownerId) {
    const nextOwner = await db.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true },
    });
    if (!nextOwner) {
      return NextResponse.json({ error: "That owner account does not exist" }, { status: 400 });
    }
    data.ownerId = body.ownerId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const restaurant = await db.restaurant.update({ where: { id }, data });

  logAudit({
    action: "RESTAURANT_UPDATED",
    entity: "Restaurant",
    entityId: id,
    detail: `Platform admin updated ${Object.keys(data).join(", ")} on "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin), fields: Object.keys(data) },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(restaurant);
}
