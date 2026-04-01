import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/admin/chats
 * All chat rooms with latest messages across all restaurants.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const roomId = url.searchParams.get("roomId") || undefined;
  const isActive = url.searchParams.get("isActive");

  // If requesting messages for a specific room
  if (roomId) {
    const messages = await db.chatMessage.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ messages: messages.reverse() });
  }

  const where: Record<string, unknown> = {};
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const [rooms, total] = await Promise.all([
    db.chatRoom.findMany({
      where,
      include: {
        restaurant: { select: { id: true, name: true, slug: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, sender: true, senderName: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.chatRoom.count({ where }),
  ]);

  return NextResponse.json({
    rooms,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * DELETE /api/admin/chats
 * Permanently delete a chat room and all its messages.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  await db.$transaction([
    db.chatMessage.deleteMany({ where: { chatRoomId: roomId } }),
    db.chatRoom.delete({ where: { id: roomId } }),
  ]);

  return NextResponse.json({ success: true });
}
