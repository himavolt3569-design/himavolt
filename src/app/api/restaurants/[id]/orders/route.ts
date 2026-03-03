import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { notifyKitchenNewOrder } from "@/lib/notifications";
import { generateBill } from "@/lib/billing";

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
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = await req.json();
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

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  const restaurant = await db.restaurant.findUnique({ where: { id } });
  if (!restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 },
    );
  }

  const orderType = type || "DINE_IN";

  // Validate delivery fields
  if (orderType === "DELIVERY" && !deliveryAddress) {
    return NextResponse.json(
      { error: "Delivery address is required" },
      { status: 400 },
    );
  }

  // Calculate delivery fee from restaurant's delivery zone config
  let deliveryFee = 0;
  if (orderType === "DELIVERY") {
    const zone = await db.deliveryZone.findFirst({
      where: { restaurantId: id, isActive: true },
    });
    if (zone) {
      deliveryFee = zone.baseFee;
      // If free delivery threshold exists and subtotal exceeds it, waive fee
      // Fee calculation will be refined when distance-based pricing goes live
    } else {
      deliveryFee = 50; // default delivery charge
    }
  }

  const subtotal = items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.13 * 100) / 100;

  // Waive delivery fee if freeAbove threshold is met
  if (orderType === "DELIVERY" && deliveryFee > 0) {
    const zone = await db.deliveryZone.findFirst({
      where: { restaurantId: id, isActive: true },
    });
    if (zone?.freeAbove && subtotal >= zone.freeAbove) {
      deliveryFee = 0;
    }
  }

  const total = subtotal + tax + deliveryFee;

  const orderNo = `HH-${Date.now().toString(36).toUpperCase()}`;

  let userId: string | undefined;
  try {
    const user = await getOrCreateUser();
    if (user) userId = user.id;
  } catch {
    // guest order
  }

  const totalPrepTime = items.reduce(
    (max: number, item: { prepTime?: string }) => {
      if (!item.prepTime) return max;
      const match = item.prepTime.match(/(\d+)/);
      const mins = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, mins);
    },
    15,
  );

  const order = await db.order.create({
    data: {
      orderNo,
      tableNo: orderType === "DINE_IN" ? tableNo || null : null,
      subtotal,
      tax,
      total,
      note: note || null,
      type: orderType,
      estimatedTime: totalPrepTime,
      restaurantId: id,
      userId: userId || null,
      // Delivery fields
      deliveryAddress: orderType === "DELIVERY" ? deliveryAddress : null,
      deliveryLat: orderType === "DELIVERY" ? deliveryLat || null : null,
      deliveryLng: orderType === "DELIVERY" ? deliveryLng || null : null,
      deliveryPhone: orderType === "DELIVERY" ? deliveryPhone || null : null,
      deliveryNote: orderType === "DELIVERY" ? deliveryNote || null : null,
      deliveryFee,
      items: {
        createMany: {
          data: items.map(
            (item: {
              name: string;
              quantity: number;
              price: number;
              menuItemId?: string;
            }) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId || null,
            }),
          ),
        },
      },
    },
    include: { items: true },
  });

  // Auto-create Delivery record for delivery orders
  if (orderType === "DELIVERY") {
    await db.delivery.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        dropoffLat: deliveryLat || null,
        dropoffLng: deliveryLng || null,
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

  notifyKitchenNewOrder(id, orderNo, total, tableNo || null).catch(() => {});

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
}
