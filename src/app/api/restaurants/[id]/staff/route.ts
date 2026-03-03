import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized, forbidden } from "@/lib/api-helpers";
import { createStaffSchema } from "@/lib/validations";

export const GET = safeHandler(async (_req, { params }) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return unauthorized();

  const staff = await db.staffMember.findMany({
    where: { restaurantId: id },
    include: {
      user: {
        select: { name: true, email: true, phone: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
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

    // Generate random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Ensure restaurant has a code
    let restaurantCode = restaurant.restaurantCode;
    if (!restaurantCode) {
      restaurantCode = `HH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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
    });
    if (existing) {
      return NextResponse.json(
        { error: "Staff member already exists" },
        { status: 409 },
      );
    }

    const member = await db.staffMember.create({
      data: {
        pin,
        role,
        userId: staffUser.id,
        restaurantId: id,
      },
      include: {
        user: {
          select: { name: true, email: true, phone: true, imageUrl: true },
        },
      },
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
