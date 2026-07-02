import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized, notFound } from "@/lib/api-helpers";
import { hashPin } from "@/lib/pin";
import { logAudit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import crypto from "crypto";
import { z } from "zod";

const joinSchema = z.object({
  restaurantCode: z.string().trim().min(1, "Restaurant code is required"),
});

// Self-service "join an existing restaurant" — creates an inactive
// StaffMember row the owner activates from the existing Staff tab. No new
// invite table: reuses StaffMember.isActive exactly like a manually
// deactivated staff member, so no owner-side UI changes are required.
export const POST = safeHandler(
  async (req, { body }) => {
    const user = await getOrCreateUser();
    if (!user) return unauthorized();

    const limit = await rateLimit(clientKey(req, `staff-join:${user.id}`), 60_000, 10);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { restaurantCode: body.restaurantCode.toUpperCase() },
    });
    if (!restaurant) return notFound("No restaurant found with that code");

    const existing = await db.staffMember.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId: restaurant.id } },
    });

    if (existing) {
      return NextResponse.json({
        status: existing.isActive ? "already-member" : "pending",
        restaurantName: restaurant.name,
      });
    }

    const placeholderPin = await hashPin(crypto.randomBytes(8).toString("hex"));

    const member = await db.staffMember.create({
      data: {
        userId: user.id,
        restaurantId: restaurant.id,
        role: "WAITER",
        pin: placeholderPin,
        isActive: false,
      },
    });

    logAudit({
      action: "STAFF_JOIN_REQUESTED",
      entity: "StaffMember",
      entityId: member.id,
      detail: `${user.name} requested to join "${restaurant.name}"`,
      metadata: { requesterEmail: user.email },
      userId: user.id,
      restaurantId: restaurant.id,
    });

    return NextResponse.json(
      { status: "pending", restaurantName: restaurant.name },
      { status: 201 },
    );
  },
  { schema: joinSchema },
);
