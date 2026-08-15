import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  requireAdminForRestaurant,
  adminActorLabel,
  TENANT_MANAGE_PERMISSIONS,
} from "@/lib/admin-restaurant-guard";

type Params = { params: Promise<{ id: string; staffId: string }> };

const STAFF_ROLES = ["SUPER_ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"];
const STAFF_TYPES = ["FULL_TIME", "SHIFT_BASED"];

const STAFF_SELECT = {
  omit: { pin: true },
  include: {
    user: { select: { id: true, name: true, email: true, phone: true, imageUrl: true } },
  },
} as const;

/**
 * Master-admin edit/delete of one staff member. Mirrors the owner route at
 * /api/restaurants/[id]/staff/[staffId], with the membership re-read against
 * the restaurant in the URL so an admin can't reach across tenants by id.
 *
 * PIN handling matches the rest of the platform: a PIN is only ever stored
 * hashed, and a reset returns the new one exactly once so support can read it
 * to the venue.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, staffId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.staffMember.findFirst({
    where: { id: staffId, restaurantId: id },
    select: { id: true, userId: true, user: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Staff member not found at this business" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  let generatedPin: string | null = null;

  if (body.role !== undefined) {
    if (!STAFF_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Unknown staff role" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (body.staffType !== undefined) {
    if (!STAFF_TYPES.includes(body.staffType)) {
      return NextResponse.json({ error: "Unknown staff type" }, { status: 400 });
    }
    data.staffType = body.staffType;
  }

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (body.pin !== undefined) {
    if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    data.pin = await hashPin(body.pin);
    generatedPin = body.pin;
  } else if (body.resetPin === true) {
    // Support usually doesn't want to choose the number — just to hand over a
    // fresh working one.
    generatedPin = (1000 + crypto.randomInt(0, 9000)).toString();
    data.pin = await hashPin(generatedPin);
  }

  // Regenerating the badge token invalidates any previously printed QR badge.
  if (body.regenerateQr === true) {
    data.qrToken = crypto.randomBytes(24).toString("base64url");
  }

  // The person behind the membership — name/phone live on the linked user row,
  // which is what a wrong-name support ticket is actually about.
  const userData: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    userData.name = body.name.trim().slice(0, 60);
  }
  if (typeof body.phone === "string") {
    userData.phone = body.phone.trim() || null;
  }

  if (Object.keys(data).length === 0 && Object.keys(userData).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (Object.keys(userData).length > 0) {
    await db.user.update({ where: { id: existing.userId }, data: userData });
  }

  const member = Object.keys(data).length
    ? await db.staffMember.update({ where: { id: staffId }, data, ...STAFF_SELECT })
    : await db.staffMember.findUniqueOrThrow({ where: { id: staffId }, ...STAFF_SELECT });

  logAudit({
    action: "STAFF_UPDATED",
    entity: "StaffMember",
    entityId: staffId,
    detail: `Platform admin updated staff "${existing.user?.name ?? staffId}" at "${guard.restaurant.name}"`,
    metadata: {
      by: adminActorLabel(guard.admin),
      fields: [...Object.keys(data), ...Object.keys(userData)],
      // Never log the PIN itself — only that one was issued.
      pinReset: generatedPin !== null,
    },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    generatedPin ? { ...member, _generatedPin: generatedPin } : member,
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, staffId } = await params;
  const guard = await requireAdminForRestaurant(req, id, TENANT_MANAGE_PERMISSIONS);
  if ("response" in guard) return guard.response;

  const existing = await db.staffMember.findFirst({
    where: { id: staffId, restaurantId: id },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Staff member not found at this business" },
      { status: 404 },
    );
  }

  await db.staffMember.delete({ where: { id: staffId } });

  logAudit({
    action: "STAFF_REMOVED",
    entity: "StaffMember",
    entityId: staffId,
    detail: `Platform admin removed staff "${existing.user?.name ?? staffId}" from "${guard.restaurant.name}"`,
    metadata: { by: adminActorLabel(guard.admin) },
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ deleted: true });
}
