import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import { logAudit, getClientIp } from "@/lib/audit";
import { createStaffSchema } from "@/lib/validations";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_VIEW_PERMISSIONS,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Master-admin staff management on behalf of a business. Mirrors the owner
 * route at /api/restaurants/[id]/staff, including the generated-PIN contract:
 * the PIN is returned exactly once, on create, and never again on read.
 */

const STAFF_SELECT = {
  omit: { pin: true },
  include: {
    user: { select: { id: true, name: true, email: true, phone: true, imageUrl: true } },
  },
} as const;

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_VIEW_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const staff = await db.staffMember.findMany({
    where: { restaurantId: id },
    ...STAFF_SELECT,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // The staff login code lives on the restaurant record, which the console
  // already loads from the profile endpoint — not repeated here.
  return NextResponse.json({ staff }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const parsed = createStaffSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid staff details" },
      { status: 400 },
    );
  }
  const { name, email, phone, role } = parsed.data;

  // Cryptographically random 4-digit PIN, surfaced once via _generatedPin.
  const pin = (1000 + crypto.randomInt(0, 9000)).toString();
  const hashedPin = await hashPin(pin);

  // Staff log in with restaurant code + PIN, so a business missing its code
  // (legacy rows) can't have working staff until one is generated.
  const restaurantRow = await db.restaurant.findUnique({
    where: { id },
    select: { restaurantCode: true },
  });
  let restaurantCode = restaurantRow?.restaurantCode;
  if (!restaurantCode) {
    restaurantCode = `HH-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    await db.restaurant.update({ where: { id }, data: { restaurantCode } });
  }

  let staffUser = await db.user.findUnique({ where: { email } });
  if (!staffUser) {
    staffUser = await db.user.create({
      data: {
        id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email,
        name,
        phone,
      },
    });
  }

  const existing = await db.staffMember.findUnique({
    where: { userId_restaurantId: { userId: staffUser.id, restaurantId: id } },
    ...STAFF_SELECT,
  });

  if (existing) {
    if (existing.isActive) {
      return NextResponse.json(
        { error: "This staff member is already active at this business" },
        { status: 409 },
      );
    }
    const reactivated = await db.staffMember.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        pin: hashedPin,
        role,
        qrToken: existing.qrToken ?? crypto.randomBytes(24).toString("base64url"),
      },
      ...STAFF_SELECT,
    });

    logAudit({
      action: "STAFF_ADDED",
      entity: "StaffMember",
      entityId: reactivated.id,
      detail: `Platform admin reactivated staff "${name}" as ${role}`,
      metadata: { by: adminActorLabel(guard.admin), name, email, role, reactivated: true },
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({
      ...reactivated,
      _generatedPin: pin,
      _restaurantCode: restaurantCode,
    });
  }

  const member = await db.staffMember.create({
    data: {
      pin: hashedPin,
      role,
      // Matches the owner route: new staff default to FULL_TIME (always active),
      // not the schema's SHIFT_BASED default.
      staffType: "FULL_TIME",
      userId: staffUser.id,
      restaurantId: id,
      qrToken: crypto.randomBytes(24).toString("base64url"),
    },
    ...STAFF_SELECT,
  });

  logAudit({
    action: "STAFF_ADDED",
    entity: "StaffMember",
    entityId: member.id,
    detail: `Platform admin added staff "${name}" as ${role}`,
    metadata: { by: adminActorLabel(guard.admin), name, email, role },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    { ...member, _generatedPin: pin, _restaurantCode: restaurantCode },
    { status: 201 },
  );
}
