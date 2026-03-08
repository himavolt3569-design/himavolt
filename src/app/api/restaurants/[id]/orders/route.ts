import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { notifyKitchenNewOrder } from "@/lib/notifications";
import { generateBill } from "@/lib/billing";
import { safeHandler, unauthorized, notFound } from "@/lib/api-helpers";
import { createOrderSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = { restaurantId: id };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: true,
        user: { select: { name: true, email: true } },
        payment: {
          select: { method: true, status: true, transactionId: true },
        },
        delivery: {
          include: {
            driver: {
              select: {
                name: true,
                phone: true,
                vehicleType: true,
                vehicleNo: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, limit, offset });
}

export const POST = safeHandler(
  async (req, { params, body }) => {
    const { id } = await params;

    const {
      tableNo,
      items,
      note,
      type,
      paymentMethod,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryPhone,
      deliveryNote,
    } = body;

    const restaurant = await db.restaurant.findUnique({ where: { id } });
    if (!restaurant) return notFound("Restaurant not found");

    const orderType = type ?? "DINE_IN";

    if (orderType === "DELIVERY" && !deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 },
      );
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const tax = Math.round(subtotal * 0.13 * 100) / 100;

    // Calculate delivery fee — single query to avoid race conditions
    let deliveryFee = 0;
    if (orderType === "DELIVERY") {
      const zone = await db.deliveryZone.findFirst({
        where: { restaurantId: id, isActive: true },
      });
      if (zone) {
        deliveryFee = zone.freeAbove && subtotal >= zone.freeAbove ? 0 : zone.baseFee;
      } else {
        deliveryFee = 50; // default delivery charge
      }
    }

    const total = subtotal + tax + deliveryFee;
    const orderNo = `HH-${Date.now().toString(36).toUpperCase()}`;

    let userId: string | undefined;
    try {
      const user = await getOrCreateUser();
      if (user) userId = user.id;
    } catch {
      // guest order — no user session
    }

    const totalPrepTime = items.reduce((max, item) => {
      if (!item.prepTime) return max;
      const match = item.prepTime.match(/(\d+)/);
      const mins = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, mins);
    }, 15);

    const order = await db.order.create({
      data: {
        orderNo,
        tableNo: orderType === "DINE_IN" ? tableNo ?? null : null,
        subtotal,
        tax,
        total,
        note: note ?? null,
        type: orderType,
        estimatedTime: totalPrepTime,
        restaurantId: id,
        userId: userId ?? null,
        deliveryAddress: orderType === "DELIVERY" ? deliveryAddress ?? null : null,
        deliveryLat: orderType === "DELIVERY" ? deliveryLat ?? null : null,
        deliveryLng: orderType === "DELIVERY" ? deliveryLng ?? null : null,
        deliveryPhone: orderType === "DELIVERY" ? deliveryPhone ?? null : null,
        deliveryNote: orderType === "DELIVERY" ? deliveryNote ?? null : null,
        deliveryFee,
        items: {
          createMany: {
            data: items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId ?? null,
            })),
          },
        },
      },
      include: { items: true },
    });

    if (orderType === "DELIVERY") {
      await db.delivery.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          dropoffLat: deliveryLat ?? null,
          dropoffLng: deliveryLng ?? null,
          fee: deliveryFee,
        },
      });
    }

    if (paymentMethod && paymentMethod !== "NONE") {
      await db.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod,
          status: "PENDING",
          amount: total,
        },
      });
    }

    await generateBill(order.id);

    await db.restaurant.update({
      where: { id },
      data: { totalOrders: { increment: 1 } },
    });

    notifyKitchenNewOrder(id, orderNo, total, tableNo ?? null).catch((err: unknown) => {
      console.error("[Orders] Failed to send kitchen notification:", err);
    });

    const fullOrder = await db.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payment: true,
        bill: true,
        delivery: true,
      },
    });

    return NextResponse.json(fullOrder, { status: 201 });
  },
  { schema: createOrderSchema },
);
