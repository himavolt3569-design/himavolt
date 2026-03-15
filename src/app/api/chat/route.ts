import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createChatRoomSchema } from "@/lib/validations";
import { getStaffSession } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

/** How long a table chat stays "active" before a new scan gets a fresh room */
const TABLE_CHAT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * POST /api/chat — create or retrieve a customer chat room.
 * Anonymous customers are allowed (orderId acts as access proof).
 */
export const POST = safeHandler(
  async (_req, { body }) => {
    const { orderId, restaurantId, tableNo, roomNo } = body;

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

    // Table/room-based pre-order chat — per-table isolation
    if (tableNo || roomNo) {
      // Look for an active TABLE_CHAT room for this specific table/room
      const existing = await db.chatRoom.findFirst({
        where: {
          restaurantId,
          type: "TABLE_CHAT",
          isActive: true,
          ...(tableNo ? { tableNo } : {}),
          ...(roomNo ? { roomNo } : {}),
        },
        orderBy: { updatedAt: "desc" },
      });

      if (existing) {
        // If last activity was recent, reuse the room (same sitting)
        const age = Date.now() - new Date(existing.updatedAt).getTime();
        if (age < TABLE_CHAT_TTL_MS) {
          return NextResponse.json(existing);
        }

        // Stale room — deactivate it so a new customer gets a fresh room
        await db.chatRoom.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
      }

      // Create a fresh per-table chat room
      const room = await db.chatRoom.create({
        data: {
          restaurantId,
          type: "TABLE_CHAT",
          ...(tableNo ? { tableNo } : {}),
          ...(roomNo ? { roomNo } : {}),
        },
      });
      return NextResponse.json(room, { status: 201 });
    }

    return NextResponse.json({ error: "orderId, tableNo, or roomNo is required" }, { status: 400 });
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

    // Staff/owner: list all active chat rooms (customer + table chats)
    const rooms = await db.chatRoom.findMany({
      where: {
        restaurantId,
        isActive: true,
        type: { in: ["CUSTOMER", "TABLE_CHAT"] },
      },
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
    // Customer rooms need a valid order; table chats need at least one message
    const filtered = rooms.filter(
      (r) =>
        (r.type === "CUSTOMER" && r.order) ||
        (r.type === "TABLE_CHAT" && r.messages.length > 0)
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(
    { error: "orderId or restaurantId required" },
    { status: 400 },
  );
});
