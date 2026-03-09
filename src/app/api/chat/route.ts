import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createChatRoomSchema } from "@/lib/validations";
import { getStaffSession } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/chat — create or retrieve a customer chat room.
 * Anonymous customers are allowed (orderId acts as access proof).
 */
export const POST = safeHandler(
  async (_req, { body }) => {
    const { orderId, restaurantId } = body;

    if (orderId) {
      // Verify the order belongs to this restaurant (prevents fake rooms)
      const order = await db.order.findFirst({
        where: { id: orderId, restaurantId },
        select: { id: true },
      });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      const existing = await db.chatRoom.findUnique({ where: { orderId } });
      if (existing) return NextResponse.json(existing);

      const room = await db.chatRoom.create({
        data: { orderId, restaurantId, type: "CUSTOMER" },
      });
      return NextResponse.json(room, { status: 201 });
    }

    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  },
  { schema: createChatRoomSchema },
);

export const GET = safeHandler(async (req) => {
  const staff = await getStaffSession(req);
  const user = staff ? null : await getAuthUser();
  const isAuth = !!staff || !!user;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const restaurantId = searchParams.get("restaurantId");
  const type = searchParams.get("type"); // "BROADCAST" for internal channel

  if (orderId) {
    // Customer can access by orderId — no login required
    const room = await db.chatRoom.findUnique({
      where: { orderId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        order: { select: { orderNo: true, status: true, tableNo: true } },
      },
    });
    return NextResponse.json(room);
  }

  if (restaurantId) {
    if (!isAuth) return unauthorized();

    if (type === "BROADCAST") {
      // Get or auto-create the broadcast channel for this restaurant
      let room = await db.chatRoom.findFirst({
        where: { restaurantId, type: "BROADCAST" },
      });
      if (!room) {
        room = await db.chatRoom.create({
          data: { restaurantId, type: "BROADCAST" },
        });
      }
      return NextResponse.json(room);
    }

    // Staff/owner: list all active customer chat rooms
    const rooms = await db.chatRoom.findMany({
      where: { restaurantId, isActive: true, type: "CUSTOMER" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        order: {
          select: {
            orderNo: true,
            status: true,
            tableNo: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(rooms);
  }

  return NextResponse.json(
    { error: "orderId or restaurantId required" },
    { status: 400 },
  );
});
