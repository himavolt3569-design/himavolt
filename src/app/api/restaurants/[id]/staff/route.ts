import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized, forbidden } from "@/lib/api-helpers";
import { createStaffSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { hashPin } from "@/lib/pin";
import crypto from "crypto";

export const GET = safeHandler(async (_req, { params }) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const restaurant = await db.restaurant.findFirst({ where: { id, ownerId: user.id } });
  if (!restaurant) return forbidden();

  const staff = await db.staffMember.findMany({
    where: { restaurantId: id },
    omit: { pin: true },
    include: {
      user: {
        select: { name: true, email: true, phone: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(staff);
});

export const POST = safeHandler(
  async (_req, { params, body }) => {
    const { id } = await params;
    const user = await getOrCreateUser();
    if (!user) return unauthorized();

    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant) return forbidden();

    const { name, email, phone, role } = body;

    // Generate cryptographically random 4-digit PIN — surfaced once via _generatedPin
    const pin = (
      1000 +
      ((await import("crypto")).randomInt(0, 9000))
    ).toString();
    const hashedPin = await hashPin(pin);

    // Restaurant code should already exist (generated on creation)
    // Fallback for legacy restaurants without one
    let restaurantCode = restaurant.restaurantCode;
    if (!restaurantCode) {
      const crypto = await import("crypto");
      restaurantCode = `HH-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      await db.restaurant.update({
        where: { id: restaurant.id },
        data: { restaurantCode },
      });
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
      where: {
        userId_restaurantId: { userId: staffUser.id, restaurantId: id },
      },
      omit: { pin: true },
      include: {
        user: {
          select: { name: true, email: true, phone: true, imageUrl: true },
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: "This staff member is already active at this restaurant" },
          { status: 409 },
        );
      }
      // Reactivate the deactivated staff member with a fresh PIN and updated role
      const reactivated = await db.staffMember.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          pin: hashedPin,
          role,
          qrToken: existing.qrToken ?? crypto.randomBytes(24).toString("base64url"),
        },
        omit: { pin: true },
        include: {
          user: {
            select: { name: true, email: true, phone: true, imageUrl: true },
          },
        },
      });
      logAudit({
        action: "STAFF_ADDED",
        entity: "StaffMember",
        entityId: reactivated.id,
        detail: `Staff "${name}" reactivated as ${role}`,
        metadata: { name, email, role, reactivated: true },
        userId: user.id,
        restaurantId: id,
      });
      return NextResponse.json(
        { ...reactivated, _generatedPin: pin, _restaurantCode: restaurantCode },
        { status: 200 },
      );
    }

    const member = await db.staffMember.create({
      data: {
        pin: hashedPin,
        role,
        // New staff default to FULL_TIME (always-active). The schema default is
        // SHIFT_BASED, but the common case is a permanent team member; owners can
        // still flip an individual to Shift-Based from the card afterwards.
        staffType: "FULL_TIME",
        userId: staffUser.id,
        restaurantId: id,
        qrToken: crypto.randomBytes(24).toString("base64url"),
      },
      omit: { pin: true },
      include: {
        user: {
          select: { name: true, email: true, phone: true, imageUrl: true },
        },
      },
    });

    logAudit({
      action: "STAFF_ADDED",
      entity: "StaffMember",
      entityId: member.id,
      detail: `Staff "${name}" added as ${role}`,
      metadata: { name, email, role },
      userId: user.id,
      restaurantId: id,
    });

    // Return PIN + code only once on creation — owner should note them down.
    // Never return PIN again in subsequent GET requests.
    return NextResponse.json(
      { ...member, _generatedPin: pin, _restaurantCode: restaurantCode },
      { status: 201 },
    );
  },
  { schema: createStaffSchema },
);
