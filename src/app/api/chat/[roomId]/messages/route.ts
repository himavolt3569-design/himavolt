import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendNotificationToUser,
  sendNotificationToRestaurantStaff,
} from "@/lib/notifications";
import { safeHandler, notFound } from "@/lib/api-helpers";
import { sendMessageSchema } from "@/lib/validations";

export const GET = safeHandler(async (_req, { params }) => {
  const { roomId } = await params;
  const { searchParams } = new URL(_req.url);
  const after = searchParams.get("after");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const where: Record<string, unknown> = { chatRoomId: roomId };
  if (after) {
    where.createdAt = { gt: new Date(after) };
  }

  const messages = await db.chatMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return NextResponse.json(messages);
});

export const POST = safeHandler(
  async (_req, { params, body }) => {
    const { roomId } = await params;
    const { content, sender, senderName, userId } = body;

    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        order: {
          select: { orderNo: true, userId: true, restaurantId: true },
        },
      },
    });

    if (!room) return notFound("Chat room not found");

    const message = await db.chatMessage.create({
      data: {
        chatRoomId: roomId,
        content: content.trim(),
        sender,
        senderName: senderName || null,
        userId: userId || null,
      },
    });

    await db.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    // Fire-and-forget notifications (only for order-linked rooms)
    if (room.order) {
      if (sender === "CUSTOMER" && room.order.restaurantId) {
        sendNotificationToRestaurantStaff(room.order.restaurantId, {
          title: "Message from Customer",
          body: content.trim().slice(0, 100),
          data: { type: "CHAT_MESSAGE", roomId, orderNo: room.order.orderNo },
        }).catch(() => {});
      } else if (
        (sender === "KITCHEN" || sender === "BILLING") &&
        room.order.userId
      ) {
        sendNotificationToUser(room.order.userId, {
          title: `Message from ${sender === "KITCHEN" ? "Kitchen" : "Billing"}`,
          body: content.trim().slice(0, 100),
          data: { type: "CHAT_MESSAGE", roomId, orderNo: room.order.orderNo },
        }).catch(() => {});
      }
    }

    return NextResponse.json(message, { status: 201 });
  },
  { schema: sendMessageSchema },
);
