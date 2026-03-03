import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createChatRoomSchema } from "@/lib/validations";
import { getStaffSession } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

/**
 * Chat auth: require either a logged-in customer or a staff member.
 * If neither is present the request is anonymous — reject.
 */
async function requireChatAuth(req: NextRequest) {
  const staff = await getStaffSession(req);
  if (staff) return true;
  const user = await getAuthUser();
  return !!user;
}

export const POST = safeHandler(
  async (req, { body }) => {
    if (!(await requireChatAuth(req))) return unauthorized();

    const { orderId, restaurantId } = body;

    const existing = await db.chatRoom.findUnique({ where: { orderId } });
    if (existing) return NextResponse.json(existing);

    const room = await db.chatRoom.create({
      data: { orderId, restaurantId },
    });

    return NextResponse.json(room, { status: 201 });
  },
  { schema: createChatRoomSchema },
);

export const GET = safeHandler(async (req) => {
  if (!(await requireChatAuth(req))) return unauthorized();

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const restaurantId = searchParams.get("restaurantId");

  if (orderId) {
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
    const rooms = await db.chatRoom.findMany({
      where: { restaurantId, isActive: true },
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
